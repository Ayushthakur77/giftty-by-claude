import { createFileRoute, Link } from "@tanstack/react-router";
import { useCartStore } from "@/lib/cart-store";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Trash2 } from "lucide-react";
import type { CartLineProduct, CartLineReadyBox } from "@/lib/pricing";

export const Route = createFileRoute("/cart")({ component: CartPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const removeLine = useCartStore((s) => s.removeLine);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  // Fetch just the display info (name/image/price) for lines currently in the cart.
  // This is DISPLAY ONLY — the actual chargeable total is always recomputed
  // server-side at checkout via the pricing engine + a fresh CatalogSnapshot.
  const productIds = lines.filter((l): l is CartLineProduct => l.type === "product").map((l) => l.productId);
  const readyBoxIds = lines.filter((l): l is CartLineReadyBox => l.type === "ready_box").map((l) => l.readyBoxId);

  const { data: products } = useQuery({
    queryKey: ["cart-products", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data } = await supabase.from("products").select("*").in("id", productIds);
      return data ?? [];
    },
    enabled: productIds.length > 0,
  });

  const { data: readyBoxes } = useQuery({
    queryKey: ["cart-ready-boxes", readyBoxIds],
    queryFn: async () => {
      if (readyBoxIds.length === 0) return [];
      const { data } = await supabase.from("ready_gift_boxes").select("*").in("id", readyBoxIds);
      return data ?? [];
    },
    enabled: readyBoxIds.length > 0,
  });

  const displaySubtotal =
    lines.reduce((sum, line) => {
      if (line.type === "product") {
        const p = products?.find((pr) => pr.id === line.productId);
        return sum + (p ? p.price_paise * line.quantity : 0);
      }
      if (line.type === "ready_box") {
        const b = readyBoxes?.find((bx) => bx.id === line.readyBoxId);
        return sum + (b ? b.price_paise * line.quantity : 0);
      }
      return sum; // custom box lines show "Priced at checkout"
    }, 0) ?? 0;

  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-maroon hover:underline">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-4">
        <h1 className="font-heading text-xl font-bold text-gray-900">Your Cart</h1>
        {lines.map((line, i) => {
          if (line.type === "product") {
            const p = products?.find((pr) => pr.id === line.productId);
            return (
              <div key={i} className="flex gap-4 border border-gray-100 rounded-xl p-3">
                <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                  {Array.isArray(p?.images) && p.images[0] ? (
                    <img src={p.images[0] as string} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{p?.name ?? "Loading…"}</p>
                  {line.personalization?.name && (
                    <p className="text-xs text-gray-400">Personalized: "{line.personalization.name}"</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateQuantity(i, Number(e.target.value))}
                      className="w-14 border border-gray-200 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="font-medium text-maroon">{p ? formatINR(p.price_paise * line.quantity) : ""}</p>
              </div>
            );
          }
          if (line.type === "ready_box") {
            const b = readyBoxes?.find((bx) => bx.id === line.readyBoxId);
            return (
              <div key={i} className="flex gap-4 border border-gray-100 rounded-xl p-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{b?.name ?? "Loading…"} (Gift Box)</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateQuantity(i, Number(e.target.value))}
                      className="w-14 border border-gray-200 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="font-medium text-maroon">{b ? formatINR(b.price_paise * line.quantity) : ""}</p>
              </div>
            );
          }
          return (
            <div key={i} className="flex gap-4 border border-gray-100 rounded-xl p-3">
              <div className="flex-1">
                <p className="text-sm text-gray-800">Custom Gift Box</p>
                <p className="text-xs text-gray-400">Priced at checkout</p>
              </div>
              <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="border border-gray-100 rounded-xl p-4 h-fit">
        <h2 className="font-medium text-gray-900 mb-3">Order Summary</h2>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Subtotal</span>
          <span>{formatINR(displaySubtotal)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Shipping, tax, and any custom box pricing are calculated at checkout.
        </p>
        <Link
          to="/checkout"
          className="block text-center bg-maroon text-white rounded-lg py-3 font-medium hover:bg-maroon-dark transition"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
