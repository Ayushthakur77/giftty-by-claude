import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronRight, Truck, ShieldCheck, IndianRupee, Cake, Heart, Home, Gift, PartyPopper, HandHeart } from "lucide-react";
import { listCategories, listProducts, listReadyBoxes } from "@/lib/public-catalog";
import { supabasePublic as supabase } from "@/lib/supabase-public-client";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { useProductRatings } from "@/lib/ratings";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const OCCASIONS = [
  { label: "Birthday", query: "birthday", icon: Cake },
  { label: "Anniversary", query: "anniversary", icon: Heart },
  { label: "Housewarming", query: "housewarming", icon: Home },
  { label: "Just Because", query: "gift", icon: Gift },
  { label: "Congratulations", query: "congratulations", icon: PartyPopper },
  { label: "Thank You", query: "thank you", icon: HandHeart },
];

const RECIPIENTS = [
  { label: "For Her", query: "her" },
  { label: "For Him", query: "him" },
  { label: "For Parents", query: "parents" },
  { label: "For Friends", query: "friend" },
  { label: "For Kids", query: "kids" },
];

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/70 p-4">
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

  const stripBanners = (banners ?? []).slice(1, 4);

  return (
    <div className="bg-cream min-h-screen">
      {/* Hero — auto-slides every 2s when there's more than one banner */}
      <HeroCarousel banners={banners ?? []} />

      {/* Trust bar — real facts, not fabricated stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <IndianRupee className="w-4 h-4 text-maroon shrink-0" />
            <span className="text-xs text-gray-600">Gifts starting at ₹99</span>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Truck className="w-4 h-4 text-maroon shrink-0" />
            <span className="text-xs text-gray-600">Delivered across India</span>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="w-4 h-4 text-maroon shrink-0" />
            <span className="text-xs text-gray-600">Secure payments</span>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Sparkles className="w-4 h-4 text-maroon shrink-0" />
            <span className="text-xs text-gray-600">AI-powered gift finder</span>
          </div>
        </div>
      </section>

      {/* Shop by Occasion */}
      <section className="max-w-[1400px] mx-auto px-3 md:px-5 pt-6">
        <h2 className="font-heading text-base md:text-lg font-bold text-gray-900 mb-3">Shop by Occasion</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {OCCASIONS.map((o) => (
            <Link
              key={o.label}
              to="/search"
              search={{ q: o.query } as any}
              className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-gray-100 py-4 px-2 hover:border-maroon/40 hover:shadow-sm transition group"
            >
              <o.icon className="w-5 h-5 text-maroon group-hover:scale-110 transition-transform" strokeWidth={1.75} />
              <span className="text-[11px] text-gray-600 text-center leading-tight">{o.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Recipient — quiet text pills */}
      <section className="max-w-[1400px] mx-auto px-3 md:px-5 pt-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">Shop for:</span>
          {RECIPIENTS.map((r) => (
            <Link
              key={r.label}
              to="/search"
              search={{ q: r.query } as any}
              className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-maroon hover:text-maroon transition"
            >
              {r.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Category strip */}
      {isSectionVisible("category_grid") && (
        <section className="max-w-[1400px] mx-auto px-3 md:px-5 pt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/70 px-4 py-4">
            <h2 className="font-heading text-base md:text-lg font-bold text-gray-900 mb-3">Shop by Category</h2>
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
                className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[3/1] sm:aspect-[16/7] group"
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
          <div className="bg-gradient-to-r from-gold to-gold-light rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg md:text-xl font-bold text-white">Ready-made gift boxes</h2>
              <Link to="/gift-boxes" className="flex items-center gap-0.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded transition">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {boxesLoading && (
              <div className="bg-white rounded-2xl p-3">
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
              <div className="bg-white rounded-2xl p-3">
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
          className="flex items-center justify-between gap-4 bg-white border border-gold/40 rounded-2xl shadow-sm px-5 py-4 hover:border-gold transition"
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
