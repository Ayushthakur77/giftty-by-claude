import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
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

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => listProducts({ search: q }),
    enabled: q.length > 0,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-2">
        Search results for "{q}"
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
          No products found for "{q}". Try a different search term.
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
