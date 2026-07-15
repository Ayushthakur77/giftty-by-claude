import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/homepage")({ component: AdminHomepagePage });

const SECTION_DEFS = [
  { type: "category_grid", label: "Category Grid" },
  { type: "ready_boxes", label: "Ready-made Gift Boxes" },
  { type: "trending", label: "Trending Products" },
];

type BannerForm = {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
};
const EMPTY_BANNER: BannerForm = { title: "", subtitle: "", image_url: "", link: "" };

function AdminHomepagePage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>(EMPTY_BANNER);
  const [saving, setSaving] = useState(false);

  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*").order("display_order");
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["admin-homepage-sections"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections").select("*");
      return data ?? [];
    },
  });

  async function toggleSection(type: string, currentlyVisible: boolean | undefined, existingId: string | undefined) {
    if (existingId) {
      await supabase.from("homepage_sections").update({ visible: !currentlyVisible }).eq("id", existingId);
    } else {
      await supabase.from("homepage_sections").insert({ section_type: type, visible: false });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
  }

  function openCreate() {
    setForm(EMPTY_BANNER);
    setModalOpen(true);
  }
  function openEdit(b: any) {
    setForm({ id: b.id, title: b.title ?? "", subtitle: b.subtitle ?? "", image_url: b.image_url, link: b.link ?? "" });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.image_url) return;
    setSaving(true);
    const payload = { title: form.title || null, subtitle: form.subtitle || null, image_url: form.image_url, link: form.link || null, visible: true };
    if (form.id) await supabase.from("banners").update(payload).eq("id", form.id);
    else await supabase.from("banners").insert(payload);
    setSaving(false);
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
  }

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Homepage Builder</h1>

      <div className="mb-8">
        <h2 className="font-medium text-gray-900 mb-3">Section visibility</h2>
        <div className="space-y-2">
          {SECTION_DEFS.map((s) => {
            const existing = sections?.find((sec) => sec.section_type === s.type);
            const visible = existing ? existing.visible : true; // default visible if no row exists yet
            return (
              <label key={s.type} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={visible} onChange={() => toggleSection(s.type, visible, existing?.id)} />
                {s.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-900">Hero Banners</h2>
        <button onClick={openCreate} className="flex items-center gap-1 bg-maroon text-white px-3 py-1.5 rounded-lg text-sm hover:bg-maroon-dark transition">
          <Plus className="w-4 h-4" /> New banner
        </button>
      </div>

      {bannersLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!bannersLoading && banners?.length === 0 && <p className="text-gray-400 text-sm">No banners yet — the default hero text will show.</p>}

      {!bannersLoading && banners && banners.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="aspect-video bg-gray-50">
                <img src={b.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900">{b.title || "Untitled"}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-maroon"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={form.id ? "Edit banner" : "New banner"}>
        <div className="space-y-3">
          <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Link (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button onClick={handleSave} disabled={saving} className="w-full bg-maroon text-white rounded-lg py-2 text-sm hover:bg-maroon-dark disabled:opacity-40 transition">
            {saving ? "Saving…" : "Save banner"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
