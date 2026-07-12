import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { listEmptyBoxes, listGiftBuilderProducts, listRibbonsFillersCards } from "@/lib/public-catalog";
import { useCartStore } from "@/lib/cart-store";

export const Route = createFileRoute("/gift-box")({ component: GiftBoxBuilderPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

type Step = "box" | "products" | "extras" | "summary";

function GiftBoxBuilderPage() {
  const navigate = useNavigate();
  const addLine = useCartStore((s) => s.addLine);
  const [step, setStep] = useState<Step>("box");
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [ribbonId, setRibbonId] = useState<string | undefined>();
  const [fillerId, setFillerId] = useState<string | undefined>();
  const [cardId, setCardId] = useState<string | undefined>();
  const [giftNote, setGiftNote] = useState("");

  const { data: boxes } = useQuery({ queryKey: ["empty-boxes"], queryFn: listEmptyBoxes });
  const selectedBox = boxes?.find((b) => b.id === selectedBoxId);

  const { data: eligibleProducts } = useQuery({
    queryKey: ["gift-builder-products", selectedBox?.allowed_category_ids],
    queryFn: () => listGiftBuilderProducts(selectedBox?.allowed_category_ids ?? []),
    enabled: !!selectedBox,
  });

  const { data: extras } = useQuery({ queryKey: ["ribbons-fillers-cards"], queryFn: listRibbonsFillersCards });

  const runningTotal =
    (selectedBox?.base_price_paise ?? 0) +
    selectedProductIds.reduce((sum, id) => sum + (eligibleProducts?.find((p) => p.id === id)?.price_paise ?? 0), 0) +
    (extras?.ribbons.find((r) => r.id === ribbonId)?.extra_price_paise ?? 0) +
    (extras?.fillers.find((f) => f.id === fillerId)?.extra_price_paise ?? 0) +
    (extras?.greetingCards.find((c) => c.id === cardId)?.extra_price_paise ?? 0);

  const capacityUsed = selectedProductIds.length;
  const capacityMax = selectedBox?.capacity ?? 0;

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= capacityMax) return prev; // capacity guard — server re-validates too
      return [...prev, id];
    });
  }

  function handleAddToCart() {
    if (!selectedBox) return;
    addLine({
      type: "custom_box",
      emptyBoxId: selectedBox.id,
      productIds: selectedProductIds,
      ribbonId,
      fillerId,
      greetingCardId: cardId,
      giftNote: giftNote || undefined,
    });
    navigate({ to: "/cart" });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-maroon mb-2">Build Your Own Gift Box</h1>
      <div className="flex gap-2 text-xs text-gray-400 mb-8">
        {(["box", "products", "extras", "summary"] as Step[]).map((s, i) => (
          <span key={s} className={step === s ? "text-maroon font-medium" : ""}>
            {i > 0 && " → "}{s === "box" ? "1. Box" : s === "products" ? "2. Products" : s === "extras" ? "3. Extras" : "4. Summary"}
          </span>
        ))}
      </div>

      {step === "box" && (
        <div>
          <h2 className="font-medium text-gray-900 mb-4">Choose an empty box</h2>
          {boxes?.length === 0 && <p className="text-gray-400 text-sm">No boxes available yet — check back soon.</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {boxes?.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBoxId(b.id)}
                className={`text-left rounded-xl border-2 overflow-hidden transition ${selectedBoxId === b.id ? "border-maroon" : "border-gray-100"}`}
              >
                <div className="aspect-square bg-gray-50">
                  {Array.isArray(b.images) && b.images[0] ? (
                    <img src={b.images[0] as string} alt={b.name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-800">{b.name}</p>
                  <p className="text-xs text-gray-400">Fits up to {b.capacity} items</p>
                  <p className="font-semibold text-maroon mt-1">{formatINR(b.base_price_paise)}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            disabled={!selectedBoxId}
            onClick={() => setStep("products")}
            className="mt-6 bg-maroon text-white px-6 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next: choose products
          </button>
        </div>
      )}

      {step === "products" && selectedBox && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900">Choose products for your {selectedBox.name}</h2>
            <span className="text-sm text-gray-500">{capacityUsed} / {capacityMax} items</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {eligibleProducts?.map((p) => {
              const selected = selectedProductIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`text-left rounded-xl border-2 overflow-hidden transition ${selected ? "border-maroon" : "border-gray-100"}`}
                >
                  <div className="aspect-square bg-gray-50">
                    {Array.isArray(p.images) && p.images[0] ? (
                      <img src={p.images[0] as string} alt={p.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-800 line-clamp-1">{p.name}</p>
                    <p className="font-semibold text-maroon mt-1">{formatINR(p.price_paise)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {eligibleProducts?.length === 0 && (
            <p className="text-gray-400 text-sm">No eligible products for this box yet.</p>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("box")} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600">Back</button>
            <button
              disabled={selectedProductIds.length === 0}
              onClick={() => setStep("extras")}
              className="bg-maroon text-white px-6 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: ribbon, filler & card
            </button>
          </div>
        </div>
      )}

      {step === "extras" && selectedBox && (
        <div className="space-y-6">
          {selectedBox.allows_ribbon && extras && extras.ribbons.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Ribbon</h3>
              <div className="flex gap-2 flex-wrap">
                {extras.ribbons.map((r) => (
                  <button key={r.id} onClick={() => setRibbonId(r.id === ribbonId ? undefined : r.id)}
                    className={`px-4 py-2 rounded-lg border text-sm ${ribbonId === r.id ? "border-maroon bg-maroon text-white" : "border-gray-300"}`}>
                    {r.name} {r.extra_price_paise > 0 && `(+${formatINR(r.extra_price_paise)})`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedBox.allows_filler && extras && extras.fillers.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Filler</h3>
              <div className="flex gap-2 flex-wrap">
                {extras.fillers.map((f) => (
                  <button key={f.id} onClick={() => setFillerId(f.id === fillerId ? undefined : f.id)}
                    className={`px-4 py-2 rounded-lg border text-sm ${fillerId === f.id ? "border-maroon bg-maroon text-white" : "border-gray-300"}`}>
                    {f.name} {f.extra_price_paise > 0 && `(+${formatINR(f.extra_price_paise)})`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedBox.allows_greeting_card && extras && extras.greetingCards.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Greeting card</h3>
              <div className="flex gap-2 flex-wrap">
                {extras.greetingCards.map((c) => (
                  <button key={c.id} onClick={() => setCardId(c.id === cardId ? undefined : c.id)}
                    className={`px-4 py-2 rounded-lg border text-sm ${cardId === c.id ? "border-maroon bg-maroon text-white" : "border-gray-300"}`}>
                    {c.name} {c.extra_price_paise > 0 && `(+${formatINR(c.extra_price_paise)})`}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Gift note</h3>
            <textarea value={giftNote} onChange={(e) => setGiftNote(e.target.value)} maxLength={200} rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Write a personal message…" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("products")} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600">Back</button>
            <button onClick={() => setStep("summary")} className="bg-maroon text-white px-6 py-2 rounded-lg">Review summary</button>
          </div>
        </div>
      )}

      {step === "summary" && selectedBox && (
        <div>
          <h2 className="font-medium text-gray-900 mb-4">Summary</h2>
          <div className="border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
            <p><span className="text-gray-500">Box:</span> {selectedBox.name} — {formatINR(selectedBox.base_price_paise)}</p>
            <p><span className="text-gray-500">Products:</span> {selectedProductIds.length} items</p>
            {ribbonId && <p><span className="text-gray-500">Ribbon:</span> {extras?.ribbons.find((r) => r.id === ribbonId)?.name}</p>}
            {fillerId && <p><span className="text-gray-500">Filler:</span> {extras?.fillers.find((f) => f.id === fillerId)?.name}</p>}
            {cardId && <p><span className="text-gray-500">Card:</span> {extras?.greetingCards.find((c) => c.id === cardId)?.name}</p>}
            {giftNote && <p><span className="text-gray-500">Note:</span> "{giftNote}"</p>}
            <p className="text-lg font-semibold text-maroon pt-2 border-t border-gray-100">
              Estimated total: {formatINR(runningTotal)}
            </p>
            <p className="text-xs text-gray-400">Final price is confirmed at checkout.</p>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("extras")} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600">Back</button>
            <button onClick={handleAddToCart} className="bg-maroon text-white px-6 py-2 rounded-lg hover:bg-maroon-dark transition">
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
