import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProducts, getCategoryBySlug } from "@/lib/public-catalog";

export const Route = createFileRoute("/c/$categorySlug")({
  component: CategoryPage,
});

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function CategoryPage() {
  const { categorySlug } = Route.useParams();
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  const { data: category } = useQuery({
    queryKey: ["category", categorySlug],
    queryFn: () => getCategoryBySlug(categorySlug),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", categorySlug, sort],
    queryFn: () => listProducts({ categorySlug, sort }),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-maroon">
            {category?.name ?? "Products"}
          </h1>
          {products && <p className="text-gray-500 text-sm">{products.length} products</p>}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && products?.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No products in this category yet — check back soon.
        </div>
      )}

      {!isLoading && products && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              to="/p/$slug"
              params={{ slug: p.slug }}
              className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition"
            >
              <div className="aspect-square bg-gray-50 overflow-hidden">
                {Array.isArray(p.images) && p.images[0] ? (
                  <img
                    src={p.images[0] as string}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    No image
                  </div>
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
