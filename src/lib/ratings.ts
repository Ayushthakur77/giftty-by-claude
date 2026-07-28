import { useQuery } from "@tanstack/react-query";
import { supabasePublic as supabase } from "./supabase-public-client";

export type RatingSummary = { avg: number; count: number };

/**
 * Batched rating lookup for a set of product ids — one query per grid
 * section instead of one query per card. Only approved reviews count.
 * Products with zero reviews are simply absent from the map (the card
 * renders with no rating badge rather than a fabricated "0.0").
 */
export function useProductRatings(productIds: string[]) {
  const ids = [...productIds].sort();
  return useQuery({
    queryKey: ["product-ratings", ids],
    queryFn: async () => {
      if (ids.length === 0) return {} as Record<string, RatingSummary>;
      const { data } = await supabase
        .from("reviews")
        .select("product_id, rating")
        .eq("status", "approved")
        .in("product_id", ids);

      const map: Record<string, RatingSummary> = {};
      for (const row of data ?? []) {
        const key = row.product_id as string;
        if (!map[key]) map[key] = { avg: 0, count: 0 };
        map[key].avg = (map[key].avg * map[key].count + (row.rating as number)) / (map[key].count + 1);
        map[key].count += 1;
      }
      for (const key of Object.keys(map)) {
        const entry = map[key]!;
        entry.avg = Math.round(entry.avg * 10) / 10;
      }
      return map;
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}
