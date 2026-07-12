import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/ai-finder")({ component: AiFinderPage });

/**
 * Placeholder for the AI Gift Assistant (Gemini-powered gift recommendation,
 * AI box builder, greeting card generator, natural-language search).
 * Intentionally NOT wired to a fake/mock response — the real implementation
 * needs a server function calling the Gemini API (GEMINI_API_KEY, server-only)
 * and is the next build phase, not this one. Honest "coming soon" beats a
 * placeholder that pretends to work.
 */
function AiFinderPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <Sparkles className="w-10 h-10 mx-auto mb-4 text-maroon" />
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">AI Gift Finder</h1>
      <p className="text-gray-500 mb-8">
        Tell us the occasion, who it's for, and your budget — our AI will suggest the perfect
        gift, build a custom box, or write a greeting message for you. Coming very soon.
      </p>
      <Link to="/" className="text-maroon hover:underline">Browse gifts in the meantime →</Link>
    </div>
  );
}
