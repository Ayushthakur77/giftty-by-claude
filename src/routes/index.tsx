import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronRight } from "lucide-react";
import { listCategories, listProducts, listReadyBoxes } from "@/lib/public-catalog";
import { supabasePublic as supabase } from "@/lib/supabase-public-client";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { useProductRatings } from "@/lib/ratings";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function SectionPanel({
  title,
  viewAllTo,
  children,
}: {
  title: string;
  viewAllTo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-[1400px] mx-auto px-3 md:px-5 py-3">
      <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg md:text-xl font-bold text-gray-900">{title}</h2>
          {viewAllTo && (
            <Link to={viewAllTo as any} className="flex items-center gap-0.5 text-xs font-semibold text-maroon hover:underline">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function HomePage() {
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["categories", "homepage"],
    queryFn: listCategories,
  });

  const { data: trending, isLoading: trendingLoading, error: trendingError } = useQuery({
    queryKey: ["products", "trending"],
    queryFn: () => listProducts({ sort: "newest", limit: 12 }),
  });

  const { data: priceProducts, isLoading: priceLoading } = useQuery({
    queryKey: ["products", "price-picks"],
    queryFn: () => listProducts({ sort: "price_asc", limit: 12 }),
  });

  const { data: readyBoxes, isLoading: boxesLoading, error: boxesError } = useQuery({
    queryKey: ["ready-boxes", "homepage"],
    queryFn: listReadyBoxes,
  });

  const { data: banners } = useQuery({
    queryKey: ["banners", "homepage"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*").eq("visible", true).order("display_order").limit(4);
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

  function isSectionVisible(type: string) {
    const row = sections?.find((s) => s.section_type === type);
    return row ? row.visible : true;
  }

  const trendingRatings = useProductRatings((trending ?? []).map((p) => p.id));
  const priceRatings = useProductRatings((priceProducts ?? []).map((p) => p.id));

  const heroBanner = banners?.[0];
  const stripBanners = (banners ?? []).slice(1, 4);

  return (
    <div className="bg-[#f1f3f6] min-h-screen">
      {/* Hero */}
      <section
        className="bg-gradient-to-br from-maroon to-maroon-dark bg-cover bg-center"
        style={heroBanner ? { backgroundImage: `url(${heroBanner.image_url})` } : undefined}
      >
        <div className={`max-w-[1400px] mx-auto px-4 py-10 md:py-16 text-center ${heroBanner ? "bg-maroon/60 backdrop-blur-sm" : ""}`}>
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-white mb-3">
            {heroBanner?.title || "Send joy across India in a click."}
          </h1>
          <p className="text-cream/90 text-sm md:text-base max-w-xl mx-auto mb-6">
            {heroBanner?.subtitle || "Personalized gifts, curated gift boxes, and an AI assistant to help you find the perfect gift for anyone, any occasion."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to={(heroBanner?.link as any) || "/gift-box"}
              className="bg-gold text-white px-5 py-2.5 rounded-sm font-semibold text-sm hover:bg-gold-light transition"
            >
              {heroBanner ? "Shop now" : "Build a gift box"}
            </Link>
            <Link
              to="/ai-finder"
              className="border border-white/60 text-white px-5 py-2.5 rounded-sm font-semibold text-sm hover:bg-white/10 transition"
            >
              Ask AI for a gift idea
            </Link>
          </div>
        </div>
      </section>

      {/* Category strip */}
      {isSectionVisible("category_grid") && (
        <section className="max-w-[1400px] mx-auto px-3 md:px-5 -mt-4 relative z-10">
          <div className="bg-white rounded-sm shadow-md border border-gray-100 px-4 py-4">
            {categoriesLoading && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-full bg-gray-100 animate-pulse" />
                ))}
              </div>
            )}
            {categoriesError && (
              <p className="text-red-500 text-sm">Could not load categories — please refresh the page.</p>
            )}
            {!categoriesLoading && categories && categories.length === 0 && (
              <p className="text-gray-400 text-sm">
                No categories yet — add some from the Admin panel and they'll show up here automatically.
              </p>
            )}
            {!categoriesLoading && categories && categories.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3 md:gap-4">
                {categories.filter((c) => !c.parent_id).slice(0, 18).map((c) => (
                  <Link key={c.id} to="/c/$categorySlug" params={{ categorySlug: c.slug }} className="text-center group">
                    <div className="aspect-square rounded-full bg-cream overflow-hidden mb-1.5 flex items-center justify-center ring-1 ring-gray-100 group-hover:ring-maroon/40 transition">
                      {c.icon_url ? (
                        <img src={c.icon_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-maroon font-heading text-lg">{c.name[0]}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 group-hover:text-maroon transition line-clamp-1">{c.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Promo strip — small tiles, Flipkart "value deals" style */}
      {stripBanners.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-3 md:px-5 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stripBanners.map((b) => (
              <a
                key={b.id}
                href={(b.link as string) || "#"}
                className="relative rounded-sm overflow-hidden bg-gray-100 aspect-[3/1] sm:aspect-[16/7] group"
              >
                {b.image_url ? (
                  <img src={b.image_url as string} alt={b.title as string} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">{b.title as string}</div>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Ready-made gift boxes — colorful deals-style panel */}
      {isSectionVisible("ready_boxes") && (
        <section className="max-w-[1400px] mx-auto px-3 md:px-5 py-3">
          <div className="bg-gradient-to-r from-gold to-gold-light rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg md:text-xl font-bold text-white">Ready-made gift boxes</h2>
              <Link to="/gift-boxes" className="flex items-center gap-0.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded transition">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {boxesLoading && (
              <div className="bg-white rounded-sm p-3">
                <ProductGridSkeleton count={6} />
              </div>
            )}
            {boxesError && (
              <p className="text-white text-sm bg-white/10 rounded p-3">Could not load gift boxes — please refresh the page.</p>
            )}
            {!boxesLoading && readyBoxes && readyBoxes.length === 0 && (
              <p className="text-white/90 text-sm bg-white/10 rounded p-3">
                No ready-made boxes published yet — create one from Admin → Ready Boxes.
              </p>
            )}
            {!boxesLoading && readyBoxes && readyBoxes.length > 0 && (
              <div className="bg-white rounded-sm p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {readyBoxes.slice(0, 6).map((b) => (
                    <ProductCard key={b.id} to="/box/$slug" product={b as any} badge="Gift Box" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trending products — dense grid */}
      {isSectionVisible("trending") && (
        <SectionPanel title="Trending now" viewAllTo="/search">
          {trendingLoading && <ProductGridSkeleton count={12} />}
          {trendingError && <p className="text-red-500 text-sm">Could not load products — please refresh the page.</p>}
          {!trendingLoading && trending && trending.length === 0 && (
            <p className="text-gray-400 text-sm">
              No products yet — add some from Admin → Products and they'll show up here automatically.
            </p>
          )}
          {!trendingLoading && trending && trending.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trending.map((p) => (
                <ProductCard key={p.id} to="/p/$slug" product={p} rating={trendingRatings.data?.[p.id]} />
              ))}
            </div>
          )}
        </SectionPanel>
      )}

      {/* Budget picks — cheapest first, like a "Under ₹X" rail */}
      {isSectionVisible("trending") && !priceLoading && priceProducts && priceProducts.length > 0 && (
        <SectionPanel title="Great value picks" viewAllTo="/search">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {priceProducts.map((p) => (
              <ProductCard key={p.id} to="/p/$slug" product={p} rating={priceRatings.data?.[p.id]} />
            ))}
          </div>
        </SectionPanel>
      )}

      {/* AI Finder CTA */}
      <section className="max-w-[1400px] mx-auto px-3 md:px-5 py-4">
        <Link
          to="/ai-finder"
          className="flex items-center justify-between gap-4 bg-white border border-gold/40 rounded-sm shadow-sm px-5 py-4 hover:border-gold transition"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-maroon shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Not sure what to gift?</p>
              <p className="text-xs text-gray-500">Ask our AI — tell us the occasion and budget, we'll find it for you.</p>
            </div>
          </div>
          <span className="text-sm text-maroon font-semibold shrink-0">Try AI Finder →</span>
        </Link>
      </section>
    </div>
  );
}
