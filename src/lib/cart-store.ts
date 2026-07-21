/**
 * Client-side cart state (Zustand). This only holds WHAT the customer wants
 * to buy (product/variant/box IDs + personalization choices) — it never
 * stores prices. Prices are always computed server-side from a fresh
 * CatalogSnapshot at cart-preview and checkout time, per the pricing engine
 * design (src/lib/pricing.ts). This is deliberate: a client-stored price
 * would be exactly the kind of thing that goes stale or gets trusted by
 * mistake — the v1 post-mortem is full of bugs shaped like that.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./pricing";

type CartStore = {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  removeLine: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clear: () => void;
};

function isValidLine(l: unknown): l is CartLine {
  if (!l || typeof l !== "object") return false;
  const type = (l as { type?: unknown }).type;
  return type === "product" || type === "ready_box" || type === "custom_box";
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) =>
        set((state) => {
          // Merge with an identical existing product line (same product+variant+personalization)
          if (line.type === "product") {
            const existingIndex = state.lines.findIndex(
              (l) =>
                l.type === "product" &&
                l.productId === line.productId &&
                l.variantId === line.variantId &&
                JSON.stringify(l.personalization ?? {}) === JSON.stringify(line.personalization ?? {})
            );
            if (existingIndex >= 0) {
              const next = [...state.lines];
              const existing = next[existingIndex];
              if (existing && existing.type === "product") {
                next[existingIndex] = { ...existing, quantity: existing.quantity + line.quantity };
                return { lines: next };
              }
            }
          }
          return { lines: [...state.lines, line] };
        }),
      removeLine: (index) =>
        set((state) => ({ lines: state.lines.filter((_, i) => i !== index) })),
      updateQuantity: (index, quantity) =>
        set((state) => {
          const next = [...state.lines];
          const line = next[index];
          if (line && (line.type === "product" || line.type === "ready_box") && quantity > 0) {
            next[index] = { ...line, quantity };
          }
          return { lines: next };
        }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "giftty-cart",
      // Bumping this version, combined with a validating merge below, means
      // any cart data saved under an older/incompatible shape (from earlier
      // schema iterations during development) is safely discarded instead
      // of crashing the app on load — a malformed cart line reaching
      // `.reduce()` in the Header's cart-count badge previously had the
      // potential to throw during hydration and silently break the whole
      // page for that one browser.
      version: 2,
      migrate: () => ({ lines: [] }),
      merge: (persisted, current) => {
        try {
          const lines = (persisted as { lines?: unknown })?.lines;
          if (!Array.isArray(lines)) return current;
          return { ...current, lines: lines.filter(isValidLine) };
        } catch {
          return current;
        }
      },
    }
  )
);
