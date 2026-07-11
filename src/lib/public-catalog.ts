/**
 * Public, read-only catalog queries used by the storefront (homepage,
 * category pages, product pages, search). These read directly from the
 * live database via the browser-safe Supabase client (RLS-protected) —
 * consistent with the "one source of truth" principle: admin CRUD and
 * storefront reads use the exact same tables.
 */
import { supabase } from "./supabase-client";

export async function listProducts(opts: {
  categorySlug?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "best_rated";
  limit?: number;
  offset?: number;
}) {
  let query = supabase.from("products").select("*, categories(slug, name)").eq("status", "active");

  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (opts.search) {
    query = query.or(`name.ilike.%${opts.search}%,short_description.ilike.%${opts.search}%`);
  }

  switch (opts.sort) {
    case "price_asc":
      query = query.order("price_paise", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_paise", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.range(
    opts.offset ?? 0,
    (opts.offset ?? 0) + (opts.limit ?? 24) - 1
  );

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(slug, name), product_variants(*)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("status", "active")
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listReadyBoxes() {
  const { data, error } = await supabase
    .from("ready_gift_boxes")
    .select("*, ready_gift_box_items(quantity, products(name, images))")
    .eq("status", "active")
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReadyBoxBySlug(slug: string) {
  const { data, error } = await supabase
    .from("ready_gift_boxes")
    .select("*, ready_gift_box_items(quantity, products(*))")
    .eq("slug", slug)
    .eq("status", "active")
    .eq("visible", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listEmptyBoxes() {
  const { data, error } = await supabase
    .from("empty_gift_boxes")
    .select("*")
    .eq("status", "active")
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEmptyBoxBySlug(slug: string) {
  const { data, error } = await supabase
    .from("empty_gift_boxes")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .eq("visible", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listGiftBuilderProducts(allowedCategoryIds: string[]) {
  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .eq("is_gift_builder_compatible", true);

  if (allowedCategoryIds.length > 0) {
    query = query.in("category_id", allowedCategoryIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listRibbonsFillersCards() {
  const [ribbons, fillers, cards] = await Promise.all([
    supabase.from("ribbons").select("*").eq("status", "active"),
    supabase.from("fillers").select("*").eq("status", "active"),
    supabase.from("greeting_cards").select("*").eq("status", "active"),
  ]);
  return {
    ribbons: ribbons.data ?? [],
    fillers: fillers.data ?? [],
    greetingCards: cards.data ?? [],
  };
}
