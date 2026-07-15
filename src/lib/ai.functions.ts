/**
 * GIFTTY v2 — AI Gift Assistant (Gemini)
 *
 * Server-only: GEMINI_API_KEY never leaves the server. The client sends a
 * natural-language request; this function fetches a real, current snapshot
 * of active products from the database, asks Gemini to pick relevant ones
 * (structured JSON output), then re-verifies every picked product is still
 * real/active/in-stock before returning it — Gemini's picks are advisory,
 * never trusted blindly as final product data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/server/supabase-admin.server";

const recommendInput = z.object({
  query: z.string().min(3).max(500),
  userId: z.string().uuid().optional(),
});

const geminiResponseSchema = {
  type: "object",
  properties: {
    reasoning: { type: "string", description: "One short friendly sentence explaining the picks" },
    productIds: {
      type: "array",
      items: { type: "string" },
      description: "Up to 6 product IDs from the candidate list that best match the request",
    },
    suggestedGreeting: { type: "string", description: "A short, warm gift note (max 200 characters) matching the occasion" },
  },
  required: ["reasoning", "productIds", "suggestedGreeting"],
};

export const getAiGiftRecommendationFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => recommendInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI Gift Finder is not configured yet. Please try again later." };
    }

    // Rate limit: max 15 AI requests per user (or IP-less bucket) per hour.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("ai_logs")
      .select("id", { count: "exact", head: true })
      .eq("feature", "gift_recommendation")
      .gte("created_at", since)
      .eq("user_id", data.userId ?? "00000000-0000-0000-0000-000000000000");

    if (data.userId && (count ?? 0) >= 15) {
      return { ok: false as const, error: "You've reached the AI request limit for now — please try again in a bit." };
    }

    // Fetch a real, current candidate set (active products only).
    const { data: candidates } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, short_description, price_paise, categories(name)")
      .eq("status", "active")
      .gt("stock", 0)
      .limit(60);

    if (!candidates || candidates.length === 0) {
      return { ok: false as const, error: "No products are available to recommend right now." };
    }

    const candidateList = candidates
      .map((p: any) => `- id:${p.id} | ${p.name} | ₹${p.price_paise / 100} | ${p.categories?.name ?? "uncategorized"} | ${p.short_description ?? ""}`)
      .join("\n");

    const prompt = `You are a gift recommendation assistant for an Indian gifting store called Giftty.
A customer says: "${data.query}"

Here is the current product catalog (id | name | price | category | description):
${candidateList}

Pick up to 6 product IDs from this EXACT list (only use ids that appear above) that best match the customer's request (occasion, recipient, budget, interests if mentioned). Also write one short warm sentence explaining your picks, and a short gift note/greeting message (max 200 characters) suited to the occasion.`;

    let aiResult: { reasoning: string; productIds: string[]; suggestedGreeting: string };
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: geminiResponseSchema,
              temperature: 0.4,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned ${response.status}`);
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      aiResult = JSON.parse(text);
    } catch (err) {
      await supabaseAdmin.from("ai_logs").insert({
        user_id: data.userId ?? null,
        feature: "gift_recommendation",
        input_summary: data.query.slice(0, 200),
        success: false,
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
      return { ok: false as const, error: "The AI assistant couldn't respond right now — please try again." };
    }

    // Re-verify picked IDs are real, currently-active candidates — never trust
    // the AI's output as final product data.
    const validIds = new Set(candidates.map((c) => c.id));
    const matchedProducts = candidates.filter((c) => aiResult.productIds.includes(c.id) && validIds.has(c.id));

    await supabaseAdmin.from("ai_logs").insert({
      user_id: data.userId ?? null,
      feature: "gift_recommendation",
      input_summary: data.query.slice(0, 200),
      success: true,
    });

    return {
      ok: true as const,
      reasoning: aiResult.reasoning,
      suggestedGreeting: aiResult.suggestedGreeting,
      products: matchedProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        pricePaise: p.price_paise,
        categoryName: p.categories?.name ?? null,
      })),
    };
  });
