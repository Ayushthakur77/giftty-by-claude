import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/empty-boxes")({ component: AdminEmptyBoxesPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type BoxForm = {
  id?: string;
  name: string;
  capacity: string;
  max_weight_grams: string;
  base_price: string;
  category_ids: string[];
  allows_ribbon: boolean;
  allows_filler: boolean;
  allows_greeting_card: boolean;
  stock: string;
  status: "active" | "draft" | "archived";
  visible: boolean;
};

const EMPTY_FORM: BoxForm = {
  name: "", capacity: "5", max_weight_grams: "2000", base_price: "",
  category_ids: [], allows_ribbon: true, allows_filler: true, allows_greeting_card: true,
  stock: "10", status: "active", visible: true,
};

function AdminEmptyBoxesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BoxForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: boxes, isLoading } = useQuery({
    queryKey: ["admin-empty-boxes"],
    queryFn: async () => {
      const { data } = await supabase.from("empty_gift_boxes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-for-select"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(b: any) {
    setForm({
      id: b.id,
      name: b.name,
      capacity: b.capacity.toString(),
      max_weight_grams: b.max_weight_grams.toString(),
      base_price: (b.base_price_paise / 100).toString(),
      category_ids: b.allowed_category_ids ?? [],
      allows_ribbon: b.allows_ribbon,
      allows_filler: b.allows_filler,
      allows_greeting_card: b.allows_greeting_card,
      stock: b.stock.toString(),
      status: b.status,
      visible: b.visible,
    });
    setError(null);
    setModalOpen(true);
  }

  function toggleCategory(id: string) {
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id) ? f.category_ids.filter((c) => c !== id) : [...f.category_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.base_price) {
      setError("Name and base price are required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name),
      capacity: parseInt(form.capacity, 10) || 1,
      max_weight_grams: parseInt(form.max_weight_grams, 10) || 1000,
      base_price_paise: Math.round(parseFloat(form.base_price) * 100),
      allowed_category_ids: form.category_ids,
      allows_ribbon: form.allows_ribbon,
      allows_filler: form.allows_filler,
      allows_greeting_card: form.allows_greeting_card,
      stock: parseInt(form.stock, 10) || 0,
      status: form.status,
      visible: form.visible,
      images: [],
    };

    const result = form.id
      ? await supabase.from("empty_gift_boxes").update(payload).eq("id", form.id)
      : await supabase.from("empty_gift_boxes").insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-empty-boxes"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this gift box?")) return;
    await supabase.from("empty_gift_boxes").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-empty-boxes"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Empty Gift Boxes {boxes && `(${boxes.length})`}
        </h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition">
          <Plus className="w-4 h-4" /> New box
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && boxes?.length === 0 && <p className="text-gray-400 text-sm">No empty boxes yet.</p>}

      {!isLoading && boxes && boxes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {boxes.map((b) => (
            <div key={b.id} className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-400">Capacity {b.capacity} · Max {b.max_weight_grams}g</p>
              <p className="text-maroon font-semibold mt-1">{formatINR(b.base_price_paise)}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{b.status}</span>
                {!b.visible && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">hidden</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-maroon"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={form.id ? "Edit box" : "New empty box"}>
        <div className="space-y-3">
          <input placeholder="Box name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Max weight (g)" type="number" value={form.max_weight_grams} onChange={(e) => setForm({ ...form, max_weight_grams: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Base price (₹)" type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />

          <div>
            <p className="text-xs text-gray-500 mb-1">Allowed categories (which products can go in this box)</p>
            <div className="flex flex-wrap gap-1">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`text-xs px-2 py-1 rounded-full border ${form.category_ids.includes(c.id) ? "bg-maroon text-white border-maroon" : "border-gray-300 text-gray-600"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 text-sm text-gray-600">
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.allows_ribbon} onChange={(e) => setForm({ ...form, allows_ribbon: e.target.checked })} /> Ribbon</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.allows_filler} onChange={(e) => setForm({ ...form, allows_filler: e.target.checked })} /> Filler</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.allows_greeting_card} onChange={(e) => setForm({ ...form, allows_greeting_card: e.target.checked })} /> Card</label>
          </div>

          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BoxForm["status"] })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
            Visible on storefront
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="w-full bg-maroon text-white rounded-lg py-2 text-sm hover:bg-maroon-dark disabled:opacity-40 transition">
            {saving ? "Saving…" : "Save box"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
