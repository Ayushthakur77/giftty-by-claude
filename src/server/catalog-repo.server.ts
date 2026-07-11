/**
 * GIFTTY v2 — Catalog Repository (server-only)
 *
 * The ONE place that reads product/box/ribbon/filler/card data from the
 * database and assembles it into a CatalogSnapshot for the pricing engine.
 *
 * v1 post-mortem: there must never be a second, separate reader of this
 * data (e.g. a static mock file) anywhere else in the codebase. Every
 * server function that needs to price a cart calls loadCatalogSnapshot()
 * — there is no other way to get product/pricing data.
 */
import { supabaseAdmin } from "./supabase-admin.server";
import type { CatalogSnapshot, CartLine } from "@/lib/pricing";

function collectIds(lines: CartLine[]) {
  const productIds = new Set<string>();
  const readyBoxIds = new Set<string>();
  const emptyBoxIds = new Set<string>();
  const ribbonIds = new Set<string>();
  const fillerIds = new Set<string>();
  const cardIds = new Set<string>();

  for (const line of lines) {
    if (line.type === "product") productIds.add(line.productId);
    if (line.type === "ready_box") readyBoxIds.add(line.readyBoxId);
    if (line.type === "custom_box") {
      emptyBoxIds.add(line.emptyBoxId);
      line.productIds.forEach((id) => productIds.add(id));
      if (line.ribbonId) ribbonIds.add(line.ribbonId);
      if (line.fillerId) fillerIds.add(line.fillerId);
      if (line.greetingCardId) cardIds.add(line.greetingCardId);
    }
  }

  return { productIds, readyBoxIds, emptyBoxIds, ribbonIds, fillerIds, cardIds };
}

/**
 * Loads exactly the rows needed to price the given cart lines, fresh from
 * the database, every time. Never caches across requests — stock and
 * prices must always be current at the moment of pricing.
 */
export async function loadCatalogSnapshot(lines: CartLine[]): Promise<CatalogSnapshot> {
  const { productIds, readyBoxIds, emptyBoxIds, ribbonIds, fillerIds, cardIds } = collectIds(lines);

  const [productsRes, variantsRes, readyBoxesRes, emptyBoxesRes, ribbonsRes, fillersRes, cardsRes] =
    await Promise.all([
      productIds.size
        ? supabaseAdmin.from("products").select("*").in("id", [...productIds])
        : Promise.resolve({ data: [], error: null }),
      productIds.size
        ? supabaseAdmin.from("product_variants").select("*").in("product_id", [...productIds])
        : Promise.resolve({ data: [], error: null }),
      readyBoxIds.size
        ? supabaseAdmin.from("ready_gift_boxes").select("*").in("id", [...readyBoxIds])
        : Promise.resolve({ data: [], error: null }),
      emptyBoxIds.size
        ? supabaseAdmin.from("empty_gift_boxes").select("*").in("id", [...emptyBoxIds])
        : Promise.resolve({ data: [], error: null }),
      ribbonIds.size
        ? supabaseAdmin.from("ribbons").select("*").in("id", [...ribbonIds])
        : Promise.resolve({ data: [], error: null }),
      fillerIds.size
        ? supabaseAdmin.from("fillers").select("*").in("id", [...fillerIds])
        : Promise.resolve({ data: [], error: null }),
      cardIds.size
        ? supabaseAdmin.from("greeting_cards").select("*").in("id", [...cardIds])
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const [name, res] of Object.entries({
    products: productsRes, variants: variantsRes, readyBoxes: readyBoxesRes,
    emptyBoxes: emptyBoxesRes, ribbons: ribbonsRes, fillers: fillersRes, cards: cardsRes,
  })) {
    if (res.error) throw new Error(`Failed to load ${name} for pricing: ${res.error.message}`);
  }

  const variantsByProduct = new Map<string, Map<string, { id: string; extraPricePaise: number; stock: number }>>();
  for (const v of variantsRes.data ?? []) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, new Map());
    variantsByProduct.get(v.product_id)!.set(v.id, {
      id: v.id,
      extraPricePaise: v.extra_price_paise,
      stock: v.stock,
    });
  }

  const products: CatalogSnapshot["products"] = new Map(
    (productsRes.data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        pricePaise: p.price_paise,
        stock: p.stock,
        status: p.status,
        weightGrams: p.weight_grams,
        isGiftBuilderCompatible: p.is_gift_builder_compatible,
        categoryId: p.category_id,
        personalizationOptions: p.personalization_options ?? {},
        variants: variantsByProduct.get(p.id) ?? new Map(),
      },
    ])
  );

  const readyBoxes: CatalogSnapshot["readyBoxes"] = new Map(
    (readyBoxesRes.data ?? []).map((b) => [
      b.id,
      { id: b.id, name: b.name, pricePaise: b.price_paise, stock: b.stock, status: b.status, visible: b.visible },
    ])
  );

  const emptyBoxes: CatalogSnapshot["emptyBoxes"] = new Map(
    (emptyBoxesRes.data ?? []).map((b) => [
      b.id,
      {
        id: b.id,
        name: b.name,
        basePricePaise: b.base_price_paise,
        capacity: b.capacity,
        maxWeightGrams: b.max_weight_grams,
        allowedCategoryIds: b.allowed_category_ids ?? [],
        stock: b.stock,
        status: b.status,
        visible: b.visible,
      },
    ])
  );

  const ribbons: CatalogSnapshot["ribbons"] = new Map(
    (ribbonsRes.data ?? []).map((r) => [r.id, { id: r.id, extraPricePaise: r.extra_price_paise }])
  );
  const fillers: CatalogSnapshot["fillers"] = new Map(
    (fillersRes.data ?? []).map((f) => [f.id, { id: f.id, extraPricePaise: f.extra_price_paise }])
  );
  const greetingCards: CatalogSnapshot["greetingCards"] = new Map(
    (cardsRes.data ?? []).map((c) => [c.id, { id: c.id, extraPricePaise: c.extra_price_paise }])
  );

  return { products, readyBoxes, emptyBoxes, ribbons, fillers, greetingCards };
}

/** Loads state-wise delivery charges as a Map, for computeShipping(). */
export async function loadDeliveryCharges() {
  const { data, error } = await supabaseAdmin.from("delivery_charges").select("*");
  if (error) throw new Error(`Failed to load delivery charges: ${error.message}`);

  return new Map(
    (data ?? []).map((d) => [
      d.state,
      {
        chargePaise: d.charge_paise,
        freeShippingThresholdPaise: d.free_shipping_threshold_paise,
        isServiceable: d.is_serviceable,
      },
    ])
  );
}
