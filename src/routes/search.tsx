import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { listCategories, listProducts, listReadyBoxes } from "@/lib/public-catalog";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { useProductRatings } from "@/lib/ratings";
import { OCCASIONS } from "@/lib/occasions";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().default(""), category: z.string().optional(), occasion: z.string().optional() }),
  component: SearchPage,
});

type SortKey = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function SearchPage() {
  const { q, category, occasion } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);
  const [sort, setSort] = useState<SortKey>("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories", "search-filter"],
    queryFn: listCategories,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", q, category, occasion, sort],
    queryFn: () => listProducts({ search: q || undefined, categorySlug: category, occasion, sort, limit: 60 }),
  });

  const { data: readyBoxes } = useQuery({
    queryKey: ["search-ready-boxes"],
    queryFn: listReadyBoxes,
    enabled: !q && !category && !occasion,
  });

  const ratings = useProductRatings((results ?? []).map((p) => p.id));

  const topLevelCategories = useMemo(() => (categories ?? []).filter((c) => !c.parent_id), [categories]);
  const activeCategory = topLevelCategories.find((c) => c.slug === category);
  const activeOccasion = OCCASIONS.find((o) => o.value === occasion);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q: input.trim(), category, occasion } });
  }

  function selectCategory(slug: string | undefined) {
    navigate({ to: "/search", search: { q, category: slug, occasion } });
    setMobileFiltersOpen(false);
  }

  function selectOccasion(value: string | undefined) {
    navigate({ to: "/search", search: { q, category, occasion: value } });
    setMobileFiltersOpen(false);
  }

  const FilterPanel = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-5">
      <div>
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Occasion</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => selectOccasion(undefined)}
            className={`block w-full text-left text-sm px-2 py-1.5 rounded transition ${!occasion ? "bg-maroon/10 text-maroon font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Any occasion
          </button>
          {OCCASIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => selectOccasion(o.value)}
              className={`block w-full text-left text-sm px-2 py-1.5 rounded transition ${occasion === o.value ? "bg-maroon/10 text-maroon font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Category</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => selectCategory(undefined)}
            className={`block w-full text-left text-sm px-2 py-1.5 rounded transition ${!category ? "bg-maroon/10 text-maroon font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
          >
            All categories
          </button>
          {topLevelCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCategory(c.slug)}
              className={`block w-full text-left text-sm px-2 py-1.5 rounded transition ${category === c.slug ? "bg-maroon/10 text-maroon font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-[1400px] mx-auto px-3 md:px-5 py-4">
        <form onSubmit={handleSearchSubmit} className="relative max-w-xl mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search all products…"
            className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
          />
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </form>

        <div className="grid md:grid-cols-[220px_1fr] gap-4">
          {/* Desktop sidebar */}
          <aside className="hidden md:block">{FilterPanel}</aside>

          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="font-heading text-base font-bold text-gray-900">
                  {activeOccasion ? `${activeOccasion.label} Gifts` : q ? `Results for "${q}"` : activeCategory ? activeCategory.name : "All Products"}
                </h1>
                {results && <p className="text-gray-400 text-xs mt-0.5">{results.length} products</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded px-2.5 py-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                </button>
                <label className="text-xs text-gray-500 hidden sm:inline">Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="text-xs font-medium border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-maroon/30"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <ProductGridSkeleton count={12} />
              </div>
            )}

            {!isLoading && results?.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 text-center py-20 text-gray-500 text-sm px-4">
                {activeOccasion
                  ? `No products tagged for ${activeOccasion.label} yet — check back soon, or browse all products.`
                  : q
                    ? `No products found for "${q}". Try a different search term.`
                    : "No products available yet."}
              </div>
            )}

            {!isLoading && results && results.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-4 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {results.map((p) => (
                    <ProductCard key={p.id} to="/p/$slug" product={p} rating={ratings.data?.[p.id]} />
                  ))}
                </div>
              </div>
            )}

            {!q && !category && !occasion && readyBoxes && readyBoxes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-4">
                <h2 className="font-heading text-base font-bold text-gray-900 mb-3">Ready-made Gift Boxes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {readyBoxes.map((b) => (
                    <ProductCard key={b.id} to="/box/$slug" product={b as any} badge="Gift Box" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-cream p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
