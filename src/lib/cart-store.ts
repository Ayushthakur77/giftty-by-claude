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
    { name: "giftty-cart" }
  )
);
