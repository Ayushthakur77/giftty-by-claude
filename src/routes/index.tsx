import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { listCategories, listProducts, listReadyBoxes } from "@/lib/public-catalog";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function ProductCardSkeleton() {
  return <div className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />;
}

function HomePage() {
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["categories", "homepage"],
    queryFn: listCategories,
  });

  const { data: trending, isLoading: trendingLoading, error: trendingError } = useQuery({
    queryKey: ["products", "trending"],
    queryFn: () => listProducts({ sort: "newest", limit: 8 }),
  });

  const { data: readyBoxes, isLoading: boxesLoading, error: boxesError } = useQuery({
    queryKey: ["ready-boxes", "homepage"],
    queryFn: listReadyBoxes,
  });

  const { data: banners } = useQuery({
    queryKey: ["banners", "homepage"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*").eq("visible", true).order("display_order").limit(1);
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["homepage-sections", "public"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections").select("section_type, visible");
      return data ?? [];
    },
  });

  // A section shows by default unless the admin explicitly hid it.
  function isSectionVisible(type: string) {
    const row = sections?.find((s) => s.section_type === type);
    return row ? row.visible : true;
  }

  const heroBanner = banners?.[0];

  return (
    <div>
      {/* Hero */}
      <section
        className="bg-gradient-to-br from-cream to-white bg-cover bg-center"
        style={heroBanner ? { backgroundImage: `url(${heroBanner.image_url})` } : undefined}
      >
        <div className={`max-w-7xl mx-auto px-4 py-16 md:py-24 text-center ${heroBanner ? "bg-white/70 backdrop-blur-sm rounded-2xl" : ""}`}>
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-maroon mb-4">
            {heroBanner?.title || "Send joy across India in a click."}
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
            {heroBanner?.subtitle || "Personalized gifts, curated gift boxes, and an AI assistant to help you find the perfect gift for anyone, any occasion."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to={(heroBanner?.link as any) || "/gift-box"}
              className="bg-maroon text-white px-6 py-3 rounded-lg font-medium hover:bg-maroon-dark transition"
            >
              {heroBanner ? "Shop now" : "Build a gift box"}
            </Link>
            <Link
              to="/ai-finder"
              className="border border-maroon text-maroon px-6 py-3 rounded-lg font-medium hover:bg-cream transition"
            >
              Ask AI for a gift idea
            </Link>
          </div>
        </div>
      </section>

      {/* Category grid */}
      {isSectionVisible("category_grid") && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-6">Shop by category</h2>
          {categoriesLoading && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
          {!categoriesLoading && categories && categories.length === 0 && (
            <p className="text-gray-400 text-sm">
              No categories yet — add some from the Admin panel and they'll show up here automatically.
            </p>
          )}
          {categoriesError && (
            <p className="text-red-500 text-sm">Could not load categories — please refresh the page.</p>
          )}
          {!categoriesLoading && categories && categories.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {categories.filter((c) => !c.parent_id).slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  to="/c/$categorySlug"
                  params={{ categorySlug: c.slug }}
                  className="text-center group"
                >
                  <div className="aspect-square rounded-full bg-cream overflow-hidden mb-2 flex items-center justify-center">
                    {c.icon_url ? (
                      <img src={c.icon_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-maroon font-heading text-lg">{c.name[0]}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 group-hover:text-maroon transition line-clamp-1">
                    {c.name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Ready-made gift boxes */}
      {isSectionVisible("ready_boxes") && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold text-gray-900">Ready-made gift boxes</h2>
            <Link to="/gift-boxes" className="text-sm text-maroon hover:underline">View all</Link>
          </div>
          {boxesLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
          {!boxesLoading && readyBoxes && readyBoxes.length === 0 && (
            <p className="text-gray-400 text-sm">
              No ready-made boxes published yet — create one from Admin → Ready Boxes.
            </p>
          )}
          {boxesError && (
            <p className="text-red-500 text-sm">Could not load gift boxes — please refresh the page.</p>
          )}
          {!boxesLoading && readyBoxes && readyBoxes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {readyBoxes.slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  to="/box/$slug"
                  params={{ slug: b.slug }}
                  className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition"
                >
                  <div className="aspect-square bg-gray-50">
                    {Array.isArray(b.images) && b.images[0] ? (
                      <img src={b.images[0] as string} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-800 line-clamp-1">{b.name}</p>
                    <p className="font-semibold text-maroon mt-1">{formatINR(b.price_paise)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending products */}
      {isSectionVisible("trending") && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-6">Trending now</h2>
          {trendingLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
          {!trendingLoading && trending && trending.length === 0 && (
            <p className="text-gray-400 text-sm">
              No products yet — add some from Admin → Products and they'll show up here automatically.
            </p>
          )}
          {trendingError && (
            <p className="text-red-500 text-sm">Could not load products — please refresh the page.</p>
          )}
          {!trendingLoading && trending && trending.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trending.map((p) => (
                <Link
                  key={p.id}
                  to="/p/$slug"
                  params={{ slug: p.slug }}
                  className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition"
                >
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
        </section>
      )}

      {/* Small AI Finder CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <Link
          to="/ai-finder"
          className="flex items-center justify-between gap-4 bg-cream border border-gold/30 rounded-xl px-5 py-4 hover:border-gold transition"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-maroon shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Not sure what to gift?</p>
              <p className="text-xs text-gray-500">Ask our AI — tell us the occasion and budget, we'll find it for you.</p>
            </div>
          </div>
          <span className="text-sm text-maroon font-medium shrink-0">Try AI Finder →</span>
        </Link>
      </section>
    </div>
  );
}
