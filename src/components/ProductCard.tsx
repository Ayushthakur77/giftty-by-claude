import { Link } from "@tanstack/react-router";
import { Star, ImageOff, Sparkles } from "lucide-react";
import type { RatingSummary } from "@/lib/ratings";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  images: unknown;
  price_paise: number;
  compare_at_price_paise?: number | null;
  is_personalization_enabled?: boolean | null;
  is_best_seller?: boolean | null;
};

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function ProductCard({
  product,
  to,
  rating,
  badge,
}: {
  product: ProductCardData;
  to: "/p/$slug" | "/box/$slug";
  rating?: RatingSummary;
  badge?: string;
}) {
  const image = Array.isArray(product.images) && product.images[0] ? (product.images[0] as string) : null;
  const mrp = product.compare_at_price_paise;
  const hasDiscount = !!mrp && mrp > product.price_paise;
  const percentOff = hasDiscount ? Math.round((1 - product.price_paise / mrp!) * 100) : 0;

  return (
    <Link
      to={to}
      params={{ slug: product.slug }}
      className="group flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md hover:border-gray-200 transition-shadow"
    >
      <div className="relative aspect-square bg-gray-50">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImageOff className="w-6 h-6" />
          </div>
        )}
        {badge && (
          <span className="absolute top-2 left-2 bg-maroon text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-mint-dark text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            {percentOff}% OFF
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 gap-1.5">
        {(product.is_best_seller || product.is_personalization_enabled) && !badge && (
          <div className="flex items-center gap-1 flex-wrap">
            {product.is_best_seller && (
              <span className="text-[9px] font-semibold text-tan-dark bg-tan/15 px-1.5 py-0.5 rounded-full">
                Bestseller
              </span>
            )}
            {product.is_personalization_enabled && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-maroon bg-maroon/10 px-1.5 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Personalizable
              </span>
            )}
          </div>
        )}

        <p className="text-xs sm:text-sm text-gray-800 line-clamp-2 leading-snug min-h-[2.4em]">
          {product.name}
        </p>

        {rating && rating.count > 0 && (
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-0.5 bg-mint-dark text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {rating.avg} <Star className="w-2.5 h-2.5 fill-white" />
            </span>
            <span className="text-[10px] text-gray-400">
              {rating.count > 999 ? `${(rating.count / 1000).toFixed(1)}k` : rating.count}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="font-semibold text-gray-900 text-sm">{formatINR(product.price_paise)}</span>
          {hasDiscount && (
            <span className="text-[11px] text-gray-400 line-through">{formatINR(mrp!)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="aspect-square bg-gray-100 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
