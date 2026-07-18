import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { listProducts } from "@/lib/public-catalog";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().default("") }),
  component: SearchPage,
});

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);

  // With no query, this browses ALL active products — this page doubles as
  // "browse everything" (linked from the header's search icon) and a real
  // search results page once a query is typed.
  const { data: results, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => listProducts(q ? { search: q } : {}),
  });

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q: input.trim() } });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <form onSubmit={handleSearchSubmit} className="relative max-w-xl mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search all products…"
          className="w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 focus:bg-white"
        />
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </form>

      <h1 className="font-heading text-xl font-bold text-gray-900 mb-2">
        {q ? `Search results for "${q}"` : "All Products"}
      </h1>
      {results && <p className="text-gray-500 text-sm mb-6">{results.length} products found</p>}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && results?.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          {q ? `No products found for "${q}". Try a different search term.` : "No products available yet."}
        </div>
      )}

      {!isLoading && results && results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {results.map((p) => (
            <Link key={p.id} to="/p/$slug" params={{ slug: p.slug }} className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-gray-50">
                {Array.isArray(p.images) && p.images[0] ? (
                  <img src={p.images[0] as string} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-800 line-clamp-2">{p.name}</p>
                <p className="font-semibold text-maroon mt-1">{formatINR(p.price_paise)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
