import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { getAiGiftRecommendationFn } from "@/lib/ai.functions";
import { useSession } from "@/lib/use-session";
import { useCartStore } from "@/lib/cart-store";

export const Route = createFileRoute("/ai-finder")({ component: AiFinderPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const EXAMPLE_PROMPTS = [
  "Birthday gift for my mom, she loves gardening, under ₹1500",
  "Anniversary gift for my husband, something romantic",
  "I want to build a custom gift box for my best friend",
];

type Result = {
  reasoning: string;
  suggestedGreeting: string;
  products: { id: string; name: string; slug: string; pricePaise: number; categoryName: string | null }[];
  readyBoxes: { id: string; name: string; slug: string; pricePaise: number }[];
  emptyBoxes: { id: string; name: string; slug: string; basePricePaise: number }[];
};

function AiFinderPage() {
  const { user } = useSession();
  const addLine = useCartStore((s) => s.addLine);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit() {
    if (query.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await getAiGiftRecommendationFn({ data: { query: query.trim(), userId: user?.id } });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res);
  }

  const totalResults = (result?.products.length ?? 0) + (result?.readyBoxes.length ?? 0) + (result?.emptyBoxes.length ?? 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-maroon" />
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">AI Gift Finder</h1>
        <p className="text-gray-500">Tell us the occasion, who it's for, and your budget — we'll search products, ready-made boxes, and build-your-own options.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Birthday gift for my sister, she loves chocolate, under ₹1000"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || query.trim().length < 3}
          className="bg-maroon text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-maroon-dark disabled:opacity-40 transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Find gifts
        </button>
      </div>

      {!result && !loading && (
        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLE_PROMPTS.map((p) => (
            <button key={p} onClick={() => setQuery(p)} className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-500 hover:border-maroon hover:text-maroon transition">
              {p}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-400 text-sm mt-6 text-center">Searching products, gift boxes, and build-your-own options…</p>}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {result && (
        <div className="mt-8">
          <p className="text-sm text-gray-600 italic mb-6">"{result.reasoning}"</p>

          {totalResults === 0 && (
            <p className="text-gray-400 text-sm">No matching items found — try rephrasing your request.</p>
          )}

          {result.products.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.products.map((p) => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-3">
                    <Link to="/p/$slug" params={{ slug: p.slug }} className="block">
                      <p className="text-sm text-gray-800 line-clamp-2">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.categoryName}</p>
                      <p className="font-semibold text-maroon mt-1">{formatINR(p.pricePaise)}</p>
                    </Link>
                    <button onClick={() => addLine({ type: "product", productId: p.id, quantity: 1 })} className="mt-2 w-full text-xs bg-maroon text-white rounded-lg py-2 hover:bg-maroon-dark transition">
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.readyBoxes.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Ready-made Gift Boxes</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.readyBoxes.map((b) => (
                  <div key={b.id} className="border border-gray-100 rounded-xl p-3">
                    <Link to="/box/$slug" params={{ slug: b.slug }} className="block">
                      <p className="text-sm text-gray-800 line-clamp-2">{b.name}</p>
                      <p className="font-semibold text-maroon mt-1">{formatINR(b.pricePaise)}</p>
                    </Link>
                    <button onClick={() => addLine({ type: "ready_box", readyBoxId: b.id, quantity: 1 })} className="mt-2 w-full text-xs bg-maroon text-white rounded-lg py-2 hover:bg-maroon-dark transition">
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.emptyBoxes.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Build Your Own Box</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.emptyBoxes.map((b) => (
                  <Link key={b.id} to="/gift-box" className="border border-gray-100 rounded-xl p-3 block hover:border-maroon transition">
                    <p className="text-sm text-gray-800 line-clamp-2">{b.name}</p>
                    <p className="font-semibold text-maroon mt-1">from {formatINR(b.basePricePaise)}</p>
                    <p className="text-xs text-maroon mt-2">Start building →</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {result.suggestedGreeting && (
            <div className="mt-6 border border-gold/30 bg-cream/40 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Suggested gift note</p>
              <p className="text-sm text-gray-700 italic">"{result.suggestedGreeting}"</p>
            </div>
          )}
        </div>
      )}

      <p className="text-center mt-10">
        <Link to="/" className="text-maroon hover:underline text-sm">Browse all gifts →</Link>
      </p>
    </div>
  );
}
