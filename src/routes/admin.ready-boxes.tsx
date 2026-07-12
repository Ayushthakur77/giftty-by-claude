import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2, Plus, Package } from "lucide-react";

export const Route = createFileRoute("/admin/ready-boxes")({ component: AdminReadyBoxesPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type BoxForm = {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  status: "active" | "draft" | "archived";
  visible: boolean;
};
const EMPTY_FORM: BoxForm = { name: "", description: "", price: "", stock: "10", status: "active", visible: true };

function AdminReadyBoxesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [itemsBoxId, setItemsBoxId] = useState<string | null>(null);
  const [form, setForm] = useState<BoxForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: boxes, isLoading } = useQuery({
    queryKey: ["admin-ready-boxes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ready_gift_boxes")
        .select("*, ready_gift_box_items(id, quantity, products(id, name))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-for-select"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, price_paise").eq("status", "active").order("name");
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
      id: b.id, name: b.name, description: b.description ?? "",
      price: (b.price_paise / 100).toString(), stock: b.stock.toString(),
      status: b.status, visible: b.visible,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) {
      setError("Name and price are required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(), slug: slugify(form.name), description: form.description || null,
      price_paise: Math.round(parseFloat(form.price) * 100), stock: parseInt(form.stock, 10) || 0,
      status: form.status, visible: form.visible, images: [],
    };

    const result = form.id
      ? await supabase.from("ready_gift_boxes").update(payload).eq("id", form.id)
      : await supabase.from("ready_gift_boxes").insert(payload);

    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-ready-boxes"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this gift box?")) return;
    await supabase.from("ready_gift_boxes").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-ready-boxes"] });
  }

  async function addItem(boxId: string, productId: string) {
    if (!productId) return;
    await supabase.from("ready_gift_box_items").insert({ ready_box_id: boxId, product_id: productId, quantity: 1 });
    queryClient.invalidateQueries({ queryKey: ["admin-ready-boxes"] });
  }

  async function removeItem(itemId: string) {
    await supabase.from("ready_gift_box_items").delete().eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["admin-ready-boxes"] });
  }

  const activeBox = boxes?.find((b) => b.id === itemsBoxId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Ready-made Gift Boxes {boxes && `(${boxes.length})`}
        </h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition">
          <Plus className="w-4 h-4" /> New box
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && boxes?.length === 0 && <p className="text-gray-400 text-sm">No ready-made boxes yet.</p>}

      {!isLoading && boxes && boxes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {boxes.map((b: any) => (
            <div key={b.id} className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-400">{b.ready_gift_box_items?.length ?? 0} items inside</p>
              <p className="text-maroon font-semibold mt-1">{formatINR(b.price_paise)}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{b.status}</span>
                {!b.visible && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">hidden</span>}
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => setItemsBoxId(b.id)} className="text-gray-400 hover:text-maroon" title="Manage items"><Package className="w-4 h-4" /></button>
                <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-maroon"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={form.id ? "Edit box" : "New ready-made box"}>
        <div className="space-y-3">
          <input placeholder="Box name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
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
          {!form.id && <p className="text-xs text-gray-400">Save first, then use the package icon to add products inside.</p>}
        </div>
      </Modal>

      <Modal open={!!itemsBoxId} onOpenChange={(o) => !o && setItemsBoxId(null)} title={`Items in "${activeBox?.name ?? ""}"`}>
        <div className="space-y-3">
          <div className="space-y-1">
            {activeBox?.ready_gift_box_items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                <span>{item.products?.name} × {item.quantity}</span>
                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {activeBox?.ready_gift_box_items?.length === 0 && <p className="text-gray-400 text-sm">No items added yet.</p>}
          </div>
          <select
            onChange={(e) => { if (itemsBoxId) addItem(itemsBoxId, e.target.value); e.target.value = ""; }}
            defaultValue=""
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="" disabled>+ Add a product…</option>
            {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatINR(p.price_paise)})</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
}
