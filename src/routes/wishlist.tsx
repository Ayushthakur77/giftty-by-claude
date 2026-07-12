import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";
import { useCartStore } from "@/lib/cart-store";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function WishlistPage() {
  const { user, loading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const addLine = useCartStore((s) => s.addLine);

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlist_items")
        .select("*, products(*), ready_gift_boxes(*)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  async function removeItem(id: string) {
    await supabase.from("wishlist_items").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  }

  if (sessionLoading) return null;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Sign in to view your wishlist.</p>
        <Link to="/auth/sign-in" className="text-maroon hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Your Wishlist</h1>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!isLoading && items?.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Heart className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          Your wishlist is empty.
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => {
            const product = item.products as { name: string; slug: string; price_paise: number; images: unknown } | null;
            const box = item.ready_gift_boxes as { name: string; slug: string; price_paise: number; images: unknown } | null;
            const entity = product ?? box;
            const link = product ? { to: "/p/$slug" as const, params: { slug: product.slug } } : { to: "/box/$slug" as const, params: { slug: box!.slug } };
            if (!entity) return null;
            return (
              <div key={item.id} className="rounded-xl border border-gray-100 overflow-hidden">
                <Link {...link} className="block">
                  <div className="aspect-square bg-gray-50">
                    {Array.isArray(entity.images) && entity.images[0] ? (
                      <img src={entity.images[0] as string} alt={entity.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-800 line-clamp-2">{entity.name}</p>
                    <p className="font-semibold text-maroon mt-1">{formatINR(entity.price_paise)}</p>
                  </div>
                </Link>
                <div className="px-3 pb-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (product) addLine({ type: "product", productId: item.product_id!, quantity: 1 });
                      else addLine({ type: "ready_box", readyBoxId: item.ready_box_id!, quantity: 1 });
                    }}
                    className="flex-1 text-xs bg-maroon text-white rounded-lg py-2 hover:bg-maroon-dark transition"
                  >
                    Add to Cart
                  </button>
                  <button onClick={() => removeItem(item.id)} className="text-xs text-gray-400 hover:text-red-500 px-2">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
