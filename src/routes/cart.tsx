import { createFileRoute, Link } from "@tanstack/react-router";
import { useCartStore } from "@/lib/cart-store";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { previewCartItemsFn } from "@/lib/checkout.functions";
import { Trash2, ShieldCheck, Minus, Plus, ShoppingBag, AlertTriangle } from "lucide-react";
import type { CartLineProduct, CartLineReadyBox } from "@/lib/pricing";

export const Route = createFileRoute("/cart")({ component: CartPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center border border-gray-200 rounded">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
        aria-label="Decrease quantity"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center text-sm font-medium">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
        aria-label="Increase quantity"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const removeLine = useCartStore((s) => s.removeLine);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

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

  // Authoritative per-line pricing — same pricing engine as checkout, so
  // custom gift boxes (and anything else) show a real price here instead of
  // a "priced at checkout" placeholder, and any line-level problem (out of
  // stock, box weight/capacity exceeded, etc) surfaces here too instead of
  // only appearing after the customer reaches the checkout page.
  const { data: priced, isFetching: pricingLoading } = useQuery({
    queryKey: ["cart-preview", lines],
    queryFn: () => previewCartItemsFn({ data: { lines } }),
    enabled: lines.length > 0,
  });

  const itemCount = lines.reduce((sum, l) => sum + ("quantity" in l ? l.quantity : 1), 0);

  let displayMrpTotal = 0;
  lines.forEach((line) => {
    if (line.type === "product") {
      const p = products?.find((pr) => pr.id === line.productId);
      if (p) displayMrpTotal += (p.compare_at_price_paise ?? p.price_paise) * line.quantity;
    }
    if (line.type === "ready_box") {
      const b = readyBoxes?.find((bx) => bx.id === line.readyBoxId);
      if (b) displayMrpTotal += (b.compare_at_price_paise ?? b.price_paise) * line.quantity;
    }
  });

  const displaySubtotal = priced?.subtotalPaise ?? 0;
  const savings = Math.max(0, displayMrpTotal - displaySubtotal);
  const hasErrors = priced?.hasErrors ?? false;

  if (lines.length === 0) {
    return (
      <div className="bg-cream min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-1">Your cart is empty.</p>
          <p className="text-gray-400 text-sm mb-6">Looks like you haven't added anything to your cart yet.</p>
          <Link to="/" className="inline-block bg-maroon text-white px-6 py-2.5 rounded-2xl font-semibold text-sm hover:bg-maroon-dark transition">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-3 md:px-5 py-4 grid md:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <h1 className="font-semibold text-gray-900">My Cart ({itemCount})</h1>
          </div>
          {hasErrors && (
            <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600 text-xs">
                Some items in your cart need attention before you can check out — see the notes below.
              </p>
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {lines.map((line, i) => {
              if (line.type === "product") {
                const p = products?.find((pr) => pr.id === line.productId);
                const hasDiscount = p?.compare_at_price_paise && p.compare_at_price_paise > p.price_paise;
                const lineError = priced?.lines[i]?.error;
                return (
                  <div key={i} className="flex gap-4 p-4">
                    <div className="w-24 h-24 bg-gray-50 rounded overflow-hidden shrink-0">
                      {Array.isArray(p?.images) && p.images[0] ? (
                        <img src={p.images[0] as string} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{p?.name ?? "Loading…"}</p>
                      {line.personalization?.name && (
                        <p className="text-xs text-gray-400 mt-0.5">Personalized: "{line.personalization.name}"</p>
                      )}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="font-semibold text-gray-900">{p ? formatINR(p.price_paise) : ""}</span>
                        {hasDiscount && (
                          <span className="text-xs text-gray-400 line-through">{formatINR(p!.compare_at_price_paise!)}</span>
                        )}
                      </div>
                      {lineError && (
                        <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> {lineError}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <QtyStepper value={line.quantity} onChange={(n) => updateQuantity(i, n)} />
                        <button onClick={() => removeLine(i)} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-500 transition">
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              if (line.type === "ready_box") {
                const b = readyBoxes?.find((bx) => bx.id === line.readyBoxId);
                const lineError = priced?.lines[i]?.error;
                return (
                  <div key={i} className="flex gap-4 p-4">
                    <div className="w-24 h-24 bg-gray-50 rounded overflow-hidden shrink-0">
                      {Array.isArray(b?.images) && b.images[0] ? (
                        <img src={b.images[0] as string} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{b?.name ?? "Loading…"} <span className="text-gray-400">(Gift Box)</span></p>
                      <p className="font-semibold text-gray-900 mt-2">{b ? formatINR(b.price_paise) : ""}</p>
                      {lineError && (
                        <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> {lineError}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <QtyStepper value={line.quantity} onChange={(n) => updateQuantity(i, n)} />
                        <button onClick={() => removeLine(i)} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-500 transition">
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              {
                const lineResult = priced?.lines[i];
                const lineError = lineResult?.error;
                return (
                  <div key={i} className="flex gap-4 p-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{lineResult?.description ?? "Custom Gift Box"}</p>
                      {lineError ? (
                        <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> {lineError}
                        </p>
                      ) : (
                        <p className="font-semibold text-gray-900 mt-1">
                          {pricingLoading ? "Calculating…" : lineResult ? formatINR(lineResult.linePaise) : ""}
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeLine(i)} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-500 transition h-fit">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                );
              }
            })}
          </div>
          <div className="p-4 flex justify-end">
            {hasErrors ? (
              <span className="bg-gray-200 text-gray-400 px-8 py-3 rounded-2xl font-semibold text-sm cursor-not-allowed">
                Fix items to continue
              </span>
            ) : (
              <Link to="/checkout" className="bg-gold text-white px-8 py-3 rounded-2xl font-semibold text-sm hover:bg-gold-light transition">
                Place Order
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-20">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 border-b border-gray-100">Price Details</h2>
          <div className="py-3 space-y-2.5 border-b border-gray-100 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Price ({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
              <span>{formatINR(displayMrpTotal || displaySubtotal)}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-mint-dark">
                <span>Discount</span>
                <span>− {formatINR(savings)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>Delivery Charges</span>
              <span className="text-gray-400 text-xs">Calculated at checkout</span>
            </div>
          </div>
          <div className="flex justify-between py-3 font-semibold text-gray-900">
            <span>Total Amount</span>
            <span>{formatINR(displaySubtotal)}</span>
          </div>
          {savings > 0 && (
            <p className="text-mint-dark text-xs font-medium pb-3">You will save {formatINR(savings)} on this order</p>
          )}
          <div className="flex items-start gap-2 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-mint-dark shrink-0 mt-0.5" />
            <span>Safe and secure payments. Easy returns. 100% authentic gifting experience.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
