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

    // Fetch a real, current candidate set with FULL product detail — name,
    // both descriptions, category, and personalization options — so the AI
    // can reason with everything the admin entered when creating the product,
    // not just a short summary.
    const { data: candidates, error: candidatesError } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, short_description, long_description, price_paise, stock, is_gift_builder_compatible, is_personalization_enabled, categories(name)")
      .eq("status", "active")
      .limit(80);

    if (candidatesError) {
      return { ok: false as const, error: `Could not load products: ${candidatesError.message}` };
    }

    const inStockCandidates = (candidates ?? []).filter((c) => c.stock > 0);

    if (inStockCandidates.length === 0) {
      return {
        ok: false as const,
        error: (candidates?.length ?? 0) > 0
          ? "All current products are out of stock — add stock to at least one product in Admin → Products."
          : "No active products yet — add some from Admin → Products first.",
      };
    }

    const candidateList = inStockCandidates
      .map((p: any) => {
        const parts = [
          `id:${p.id}`,
          p.name,
          `₹${p.price_paise / 100}`,
          p.categories?.name ?? "uncategorized",
          p.short_description ?? "",
          p.long_description ?? "",
          p.is_personalization_enabled ? "(personalizable)" : "",
        ].filter(Boolean);
        return `- ${parts.join(" | ")}`;
      })
      .join("\n");

    const prompt = `You are a gift recommendation assistant for an Indian gifting store called Giftty.
A customer says: "${data.query}"

Here is the current product catalog (id | name | price | category | short description | long description | personalization flag):
${candidateList}

Pick up to 6 product IDs from this EXACT list (only use ids that appear above) that best match the customer's request (occasion, recipient, budget, interests if mentioned). Use both the short and long description to judge fit, not just the name. Also write one short warm sentence explaining your picks, and a short gift note/greeting message (max 200 characters) suited to the occasion.`;

    let aiResult: { reasoning: string; productIds: string[]; suggestedGreeting: string };
    let lastErrorDetail = "";
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
        const errBody = await response.text().catch(() => "");
        lastErrorDetail = `Gemini API ${response.status}: ${errBody.slice(0, 300)}`;
        throw new Error(lastErrorDetail);
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastErrorDetail = `Empty response from Gemini: ${JSON.stringify(json).slice(0, 300)}`;
        throw new Error(lastErrorDetail);
      }
      aiResult = JSON.parse(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabaseAdmin.from("ai_logs").insert({
        user_id: data.userId ?? null,
        feature: "gift_recommendation",
        input_summary: data.query.slice(0, 200),
        success: false,
        error_message: (lastErrorDetail || message).slice(0, 500),
      });
      return { ok: false as const, error: `AI assistant error: ${(lastErrorDetail || message).slice(0, 200)}` };
    }

    // Re-verify picked IDs are real, currently-active, in-stock candidates —
    // never trust the AI's output as final product data.
    const validIds = new Set(inStockCandidates.map((c) => c.id));
    const matchedProducts = inStockCandidates.filter((c) => aiResult.productIds.includes(c.id) && validIds.has(c.id));

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
