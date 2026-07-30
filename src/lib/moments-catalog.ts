import { supabasePublic } from "@/lib/supabase-public-client";
import { supabase } from "@/lib/supabase-client";

export type MomentFieldType = "text" | "textarea" | "date" | "image";

export type MomentField = {
  key: string;
  label: string;
  type: MomentFieldType;
  placeholder?: string;
  max_length?: number;
};

export type MomentTemplate = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  thumbnail_url: string | null;
  fields_schema: MomentField[];
  default_theme_color: string;
  is_active: boolean;
  display_order: number;
};

export type MomentPage = {
  id: string;
  template_id: string;
  user_id: string;
  slug: string;
  title: string | null;
  data_json: Record<string, string>;
  theme_color: string | null;
  font_style: string | null;
  music_url: string | null;
  is_published: boolean;
  is_premium: boolean;
  views: number;
  created_at: string;
};

// ---- Public reads (work whether the visitor is logged in or not) ----------

export async function listMomentTemplates(): Promise<MomentTemplate[]> {
  const { data, error } = await supabasePublic
    .from("moments_templates")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MomentTemplate[];
}

export async function getMomentTemplate(slug: string): Promise<MomentTemplate | null> {
  const { data, error } = await supabasePublic
    .from("moments_templates")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as MomentTemplate | null;
}

export async function getMomentPageBySlug(slug: string): Promise<MomentPage | null> {
  const { data, error } = await supabasePublic
    .from("moments_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as MomentPage | null;
}

export async function incrementMomentPageViews(slug: string): Promise<void> {
  await supabasePublic.rpc("increment_moment_page_views", { page_slug: slug });
}

// ---- Authenticated reads/writes (owner-only, via RLS) ----------------------

export async function listMyMomentPages(userId: string): Promise<(MomentPage & { moments_templates: { title: string; slug: string } | null })[]> {
  const { data, error } = await supabase
    .from("moments_pages")
    .select("*, moments_templates(title, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (MomentPage & { moments_templates: { title: string; slug: string } | null })[];
}

function generateSlug(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous 0/o/1/l/i
  let out = "";
  for (let i = 0; i < 7; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createMomentPage(params: {
  userId: string;
  templateId: string;
  title: string;
  dataJson: Record<string, string>;
  themeColor: string;
  fontStyle: string;
}): Promise<MomentPage> {
  // Slugs are short (7 chars, ~35 possible chars) so retry once or twice on
  // the rare collision rather than trying to pre-check availability.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    const { data, error } = await supabase
      .from("moments_pages")
      .insert({
        user_id: params.userId,
        template_id: params.templateId,
        slug,
        title: params.title,
        data_json: params.dataJson,
        theme_color: params.themeColor,
        font_style: params.fontStyle,
        is_published: true,
      })
      .select("*")
      .single();
    if (!error) return data as unknown as MomentPage;
    if (!error.message.includes("duplicate key")) throw new Error(error.message);
  }
  throw new Error("Could not generate a unique link — please try again.");
}

export async function uploadMomentImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("giftty-moments").upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("giftty-moments").getPublicUrl(path);
  return data.publicUrl;
}
