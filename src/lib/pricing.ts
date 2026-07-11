/**
 * GIFTTY v2 — Pricing Engine
 *
 * Design principle (v1 post-mortem): this is a PURE function. It never
 * imports a static/mock catalog file, and it never has a silent default
 * empty-snapshot fallback. Every caller MUST load a real CatalogSnapshot
 * from the database (via loadCatalogSnapshot in catalog-repo.server.ts)
 * and pass it in. If a caller forgets, TypeScript will error — there is
 * no default parameter to silently mask the mistake.
 */

export type CartLineProduct = {
  type: "product";
  productId: string;
  variantId?: string;
  quantity: number;
  personalization?: { name?: string; message?: string; font?: string; color?: string };
};

export type CartLineReadyBox = {
  type: "ready_box";
  readyBoxId: string;
  quantity: number;
};

export type CartLineCustomBox = {
  type: "custom_box";
  emptyBoxId: string;
  productIds: string[]; // may include duplicates for quantity > 1 of same product
  ribbonId?: string;
  fillerId?: string;
  greetingCardId?: string;
  giftNote?: string;
};

export type CartLine = CartLineProduct | CartLineReadyBox | CartLineCustomBox;

export type CatalogSnapshot = {
  products: Map<string, {
    id: string;
    name: string;
    pricePaise: number;
    stock: number;
    status: "active" | "draft" | "archived";
    weightGrams: number;
    isGiftBuilderCompatible: boolean;
    categoryId: string | null;
    personalizationOptions: Record<string, { enabled: boolean; maxLength?: number; extraPaise?: number }>;
    variants: Map<string, { id: string; extraPricePaise: number; stock: number }>;
  }>;
  readyBoxes: Map<string, {
    id: string; name: string; pricePaise: number; stock: number; status: string; visible: boolean;
  }>;
  emptyBoxes: Map<string, {
    id: string; name: string; basePricePaise: number; capacity: number; maxWeightGrams: number;
    allowedCategoryIds: string[]; stock: number; status: string; visible: boolean;
  }>;
  ribbons: Map<string, { id: string; extraPricePaise: number }>;
  fillers: Map<string, { id: string; extraPricePaise: number }>;
  greetingCards: Map<string, { id: string; extraPricePaise: number }>;
};

export type PricedLine = {
  raw: CartLine;
  descriptionSnapshot: string;
  unitPricePaise: number;
  quantity: number;
  linePaise: number;
  error?: string; // e.g. "Out of stock", "Product unavailable", "Box capacity exceeded"
};

export type CartTotals = {
  lines: PricedLine[];
  hasErrors: boolean;
  subtotalPaise: number;
  weightGrams: number;
};

const PERSONALIZATION_CHAR_LIMIT_DEFAULT = 200;

function priceProductLine(line: CartLineProduct, snap: CatalogSnapshot): PricedLine {
  const p = snap.products.get(line.productId);
  if (!p || p.status !== "active") {
    return { raw: line, descriptionSnapshot: "Unavailable product", unitPricePaise: 0, quantity: line.quantity, linePaise: 0, error: "Product no longer available" };
  }

  let unit = p.pricePaise;
  let stockAvailable = p.stock;

  if (line.variantId) {
    const v = p.variants.get(line.variantId);
    if (!v) {
      return { raw: line, descriptionSnapshot: p.name, unitPricePaise: 0, quantity: line.quantity, linePaise: 0, error: "Variant no longer available" };
    }
    unit += v.extraPricePaise;
    stockAvailable = v.stock;
  }

  if (line.personalization) {
    for (const [key, value] of Object.entries(line.personalization)) {
      if (!value) continue;
      const opt = p.personalizationOptions[key];
      if (!opt?.enabled) continue;
      const limit = opt.maxLength ?? PERSONALIZATION_CHAR_LIMIT_DEFAULT;
      if (typeof value === "string" && value.length > limit) {
        return { raw: line, descriptionSnapshot: p.name, unitPricePaise: unit, quantity: line.quantity, linePaise: 0, error: `${key} exceeds ${limit} characters` };
      }
      unit += opt.extraPaise ?? 0;
    }
  }

  if (line.quantity > stockAvailable) {
    return { raw: line, descriptionSnapshot: p.name, unitPricePaise: unit, quantity: line.quantity, linePaise: unit * line.quantity, error: `Only ${stockAvailable} in stock` };
  }

  return { raw: line, descriptionSnapshot: p.name, unitPricePaise: unit, quantity: line.quantity, linePaise: unit * line.quantity };
}

function priceReadyBoxLine(line: CartLineReadyBox, snap: CatalogSnapshot): PricedLine {
  const b = snap.readyBoxes.get(line.readyBoxId);
  if (!b || b.status !== "active" || !b.visible) {
    return { raw: line, descriptionSnapshot: "Unavailable gift box", unitPricePaise: 0, quantity: line.quantity, linePaise: 0, error: "Gift box no longer available" };
  }
  if (line.quantity > b.stock) {
    return { raw: line, descriptionSnapshot: b.name, unitPricePaise: b.pricePaise, quantity: line.quantity, linePaise: b.pricePaise * line.quantity, error: `Only ${b.stock} in stock` };
  }
  return { raw: line, descriptionSnapshot: b.name, unitPricePaise: b.pricePaise, quantity: line.quantity, linePaise: b.pricePaise * line.quantity };
}

function priceCustomBoxLine(line: CartLineCustomBox, snap: CatalogSnapshot): PricedLine {
  const box = snap.emptyBoxes.get(line.emptyBoxId);
  if (!box || box.status !== "active" || !box.visible) {
    return { raw: line, descriptionSnapshot: "Unavailable gift box", unitPricePaise: 0, quantity: 1, linePaise: 0, error: "Gift box no longer available" };
  }

  if (line.productIds.length > box.capacity) {
    return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: `Box capacity is ${box.capacity} items` };
  }

  let total = box.basePricePaise;
  let totalWeight = 0;
  const stockNeeded = new Map<string, number>();

  for (const productId of line.productIds) {
    const p = snap.products.get(productId);
    if (!p || p.status !== "active") {
      return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: "One of the selected products is no longer available" };
    }
    if (!p.isGiftBuilderCompatible) {
      return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: `${p.name} cannot be added to a gift box` };
    }
    if (box.allowedCategoryIds.length > 0 && (!p.categoryId || !box.allowedCategoryIds.includes(p.categoryId))) {
      return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: `${p.name} is not allowed in this box` };
    }
    total += p.pricePaise;
    totalWeight += p.weightGrams;
    stockNeeded.set(productId, (stockNeeded.get(productId) ?? 0) + 1);
  }

  for (const [productId, needed] of stockNeeded) {
    const p = snap.products.get(productId)!;
    if (needed > p.stock) {
      return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: `${p.name}: only ${p.stock} in stock` };
    }
  }

  if (totalWeight > box.maxWeightGrams) {
    return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: `Box exceeds max weight of ${box.maxWeightGrams}g` };
  }

  if (line.ribbonId) {
    const r = snap.ribbons.get(line.ribbonId);
    if (!r) return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: "Selected ribbon unavailable" };
    total += r.extraPricePaise;
  }
  if (line.fillerId) {
    const f = snap.fillers.get(line.fillerId);
    if (!f) return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: "Selected filler unavailable" };
    total += f.extraPricePaise;
  }
  if (line.greetingCardId) {
    const g = snap.greetingCards.get(line.greetingCardId);
    if (!g) return { raw: line, descriptionSnapshot: box.name, unitPricePaise: 0, quantity: 1, linePaise: 0, error: "Selected greeting card unavailable" };
    total += g.extraPricePaise;
  }

  return { raw: line, descriptionSnapshot: box.name, unitPricePaise: total, quantity: 1, linePaise: total };
}

/**
 * Pure pricing computation. `snap` is REQUIRED (no default) — every caller
 * must load it fresh from the database via loadCatalogSnapshot() first.
 */
export function priceCart(lines: CartLine[], snap: CatalogSnapshot): CartTotals {
  const priced = lines.map((line) => {
    if (line.type === "product") return priceProductLine(line, snap);
    if (line.type === "ready_box") return priceReadyBoxLine(line, snap);
    return priceCustomBoxLine(line, snap);
  });

  const hasErrors = priced.some((l) => !!l.error);
  const subtotalPaise = priced.reduce((sum, l) => sum + l.linePaise, 0);
  const weightGrams = priced.reduce((sum, l) => sum + estimateLineWeight(l, snap), 0);

  return { lines: priced, hasErrors, subtotalPaise, weightGrams };
}

function estimateLineWeight(line: PricedLine, snap: CatalogSnapshot): number {
  if (line.raw.type === "product") {
    const p = snap.products.get(line.raw.productId);
    return (p?.weightGrams ?? 0) * line.quantity;
  }
  return 0; // ready/custom boxes: weight is validated internally, not needed for shipping calc precision here
}

export function computeShipping(state: string, subtotalPaise: number, deliveryCharges: Map<string, { chargePaise: number; freeShippingThresholdPaise: number; isServiceable: boolean }>): { shippingPaise: number; error?: string } {
  const charge = deliveryCharges.get(state);
  if (!charge || !charge.isServiceable) {
    return { shippingPaise: 0, error: `Delivery not available to ${state}` };
  }
  if (subtotalPaise >= charge.freeShippingThresholdPaise) {
    return { shippingPaise: 0 };
  }
  return { shippingPaise: charge.chargePaise };
}

export function computeTax(subtotalPaise: number, gstPercent: number): number {
  return Math.round((subtotalPaise * gstPercent) / 100);
}
