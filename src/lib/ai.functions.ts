/**
 * GIFTTY v2 — AI Gift Assistant (Gemini)
 *
 * Server-only: GEMINI_API_KEY never leaves the server. The client sends a
 * natural-language request; this function fetches a real, current snapshot
 * of active products, ready-made gift boxes, AND empty gift boxes from the
 * database, asks Gemini to pick relevant ones across all three (structured
 * JSON output), then re-verifies every picked ID is still real/active/
 * in-stock before returning it — Gemini's picks are advisory, never trusted
 * blindly as final data.
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
    productIds: { type: "array", items: { type: "string" }, description: "Up to 4 matching product ids" },
    readyBoxIds: { type: "array", items: { type: "string" }, description: "Up to 3 matching ready-made gift box ids" },
    emptyBoxIds: { type: "array", items: { type: "string" }, description: "Up to 2 matching empty/build-your-own gift box ids, if the request suggests a custom box would suit better" },
    suggestedGreeting: { type: "string", description: "A short, warm gift note (max 200 characters) matching the occasion" },
  },
  required: ["reasoning", "productIds", "readyBoxIds", "emptyBoxIds", "suggestedGreeting"],
};

const greetingInput = z.object({
  context: z.string().min(3).max(300),
  tone: z.enum(["heartfelt", "funny", "formal", "romantic", "short"]),
});

/**
 * AI Greeting/Gift-note writer, used in the Gift Box Builder. Given a short
 * description of the occasion/recipient and a desired tone, returns a ready-
 * to-use gift note the customer can edit before checkout.
 */
export const getAiGreetingMessageFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => greetingInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI message writer is not configured yet." };

    const toneDescriptions: Record<string, string> = {
      heartfelt: "warm, sincere, and emotionally genuine",
      funny: "lighthearted, playful, and a little funny",
      formal: "polite, respectful, and formal",
      romantic: "romantic and affectionate",
      short: "very short and sweet, one line only",
    };

    const prompt = `Write a gift note/greeting card message for an Indian gifting store called Giftty.
Context from the customer: "${data.context}"
Desired tone: ${toneDescriptions[data.tone]}.
Keep it under 200 characters. Return ONLY the message text, no quotes, no explanation.`;

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 100 },
          }),
        }
      );
      if (!response.ok) throw new Error(`Gemini API ${response.status}`);
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Empty response");

      await supabaseAdmin.from("ai_logs").insert({ feature: "greeting_card", input_summary: data.context.slice(0, 200), success: true });

      return { ok: true as const, message: text.replace(/^["']|["']$/g, "").slice(0, 200) };
    } catch (err) {
      await supabaseAdmin.from("ai_logs").insert({
        feature: "greeting_card",
        input_summary: data.context.slice(0, 200),
        success: false,
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
      return { ok: false as const, error: "Could not generate a message right now — please try again." };
    }
  });

/**
 * AI Gift Finder — searches products, ready-made gift boxes, AND empty/
 * build-your-own boxes based on a natural-language request.
 */
export const getAiGiftRecommendationFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => recommendInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI Gift Finder is not configured yet — GEMINI_API_KEY is missing." };
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Run everything independent in parallel to stay well under the
    // serverless function time limit.
    const [rateLimitRes, productsRes, readyBoxesRes, emptyBoxesRes] = await Promise.all([
      supabaseAdmin
        .from("ai_logs")
        .select("id", { count: "exact", head: true })
        .eq("feature", "gift_recommendation")
        .gte("created_at", since)
        .eq("user_id", data.userId ?? "00000000-0000-0000-0000-000000000000"),
      supabaseAdmin
        .from("products")
        .select("id, name, slug, images, short_description, long_description, price_paise, stock, is_personalization_enabled, categories(name)")
        .eq("status", "active")
        .limit(60),
      supabaseAdmin
        .from("ready_gift_boxes")
        .select("id, name, slug, images, description, price_paise, stock")
        .eq("status", "active")
        .eq("visible", true)
        .limit(20),
      supabaseAdmin
        .from("empty_gift_boxes")
        .select("id, name, slug, images, description, base_price_paise, capacity, stock")
        .eq("status", "active")
        .eq("visible", true)
        .limit(15),
    ]);

    if (data.userId && (rateLimitRes.count ?? 0) >= 15) {
      return { ok: false as const, error: "You've reached the AI request limit for now — please try again in a bit." };
    }

    const products = (productsRes.data ?? []).filter((p) => p.stock > 0);
    const readyBoxes = (readyBoxesRes.data ?? []).filter((b) => b.stock > 0);
    const emptyBoxes = (emptyBoxesRes.data ?? []).filter((b) => b.stock > 0);

    if (products.length === 0 && readyBoxes.length === 0 && emptyBoxes.length === 0) {
      return { ok: false as const, error: "No in-stock products or gift boxes yet — add some from the Admin panel first." };
    }

    const productLines = products
      .map((p: any) => `- id:${p.id} | PRODUCT | ${p.name} | ₹${p.price_paise / 100} | ${p.categories?.name ?? "uncategorized"} | ${p.short_description ?? ""} | ${p.long_description ?? ""}${p.is_personalization_enabled ? " | (personalizable)" : ""}`)
      .join("\n");
    const readyBoxLines = readyBoxes
      .map((b) => `- id:${b.id} | READY_GIFT_BOX | ${b.name} | ₹${b.price_paise / 100} | ${b.description ?? ""}`)
      .join("\n");
    const emptyBoxLines = emptyBoxes
      .map((b) => `- id:${b.id} | BUILD_YOUR_OWN_BOX | ${b.name} | from ₹${b.base_price_paise / 100} | fits ${b.capacity} items | ${b.description ?? ""}`)
      .join("\n");

    const prompt = `You are a gift recommendation assistant for an Indian gifting store called Giftty.
A customer says: "${data.query}"

Here is the current catalog. Each line is one item: id | TYPE | name | price | details.

${productLines}
${readyBoxLines}
${emptyBoxLines}

TYPE meanings: PRODUCT = a single item. READY_GIFT_BOX = a pre-curated gift box, ready to buy as-is. BUILD_YOUR_OWN_BOX = an empty box the customer would personally fill with products themselves (only suggest this if the customer seems to want to build something custom/personal).

Pick matching ids from the EXACT ids listed above only, split into productIds, readyBoxIds, and emptyBoxIds. Use both short and long descriptions to judge fit, not just the name. Write one short warm sentence explaining your picks, and a short gift note/greeting message (max 200 characters) suited to the occasion.`;

    let aiResult: { reasoning: string; productIds: string[]; readyBoxIds: string[]; emptyBoxIds: string[]; suggestedGreeting: string };
    let lastErrorDetail = "";
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: geminiResponseSchema, temperature: 0.4 },
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

    // Re-verify every picked id against the real, current candidate sets.
    const productMap = new Map(products.map((p) => [p.id, p]));
    const readyBoxMap = new Map(readyBoxes.map((b) => [b.id, b]));
    const emptyBoxMap = new Map(emptyBoxes.map((b) => [b.id, b]));

    const matchedProducts = aiResult.productIds.map((id) => productMap.get(id)).filter(Boolean) as typeof products;
    const matchedReadyBoxes = aiResult.readyBoxIds.map((id) => readyBoxMap.get(id)).filter(Boolean) as typeof readyBoxes;
    const matchedEmptyBoxes = aiResult.emptyBoxIds.map((id) => emptyBoxMap.get(id)).filter(Boolean) as typeof emptyBoxes;

    await supabaseAdmin.from("ai_logs").insert({
      user_id: data.userId ?? null,
      feature: "gift_recommendation",
      input_summary: data.query.slice(0, 200),
      success: true,
    });

    function firstImage(images: unknown): string | null {
      return Array.isArray(images) && images[0] ? (images[0] as string) : null;
    }

    return {
      ok: true as const,
      reasoning: aiResult.reasoning,
      suggestedGreeting: aiResult.suggestedGreeting,
      products: matchedProducts.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, image: firstImage(p.images), pricePaise: p.price_paise, categoryName: p.categories?.name ?? null })),
      readyBoxes: matchedReadyBoxes.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug, image: firstImage(b.images), pricePaise: b.price_paise })),
      emptyBoxes: matchedEmptyBoxes.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug, image: firstImage(b.images), basePricePaise: b.base_price_paise })),
    };
  });
