import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/products")({ component: AdminProductsPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type ProductForm = {
  id?: string;
  name: string;
  category_id: string;
  price: string; // entered in ₹ by the admin, converted to paise on save
  stock: string;
  short_description: string;
  status: "active" | "draft" | "archived";
  is_gift_builder_compatible: boolean;
};

const EMPTY_FORM: ProductForm = {
  name: "", category_id: "", price: "", stock: "0", short_description: "",
  status: "active", is_gift_builder_compatible: false,
};

function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
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

  function openEdit(p: any) {
    setForm({
      id: p.id,
      name: p.name,
      category_id: p.category_id ?? "",
      price: (p.price_paise / 100).toString(),
      stock: p.stock.toString(),
      short_description: p.short_description ?? "",
      status: p.status,
      is_gift_builder_compatible: p.is_gift_builder_compatible,
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
      name: form.name.trim(),
      slug: slugify(form.name),
      category_id: form.category_id || null,
      price_paise: Math.round(parseFloat(form.price) * 100),
      stock: parseInt(form.stock, 10) || 0,
      short_description: form.short_description || null,
      status: form.status,
      is_gift_builder_compatible: form.is_gift_builder_compatible,
      images: [],
    };

    const result = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await supabase.from("products").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-yellow-100 text-yellow-700",
    archived: "bg-gray-100 text-gray-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Products {products && `(${products.length})`}
        </h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition">
          <Plus className="w-4 h-4" /> New product
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!isLoading && products?.length === 0 && (
        <p className="text-gray-400 text-sm">No products yet — click "New product" to add your first one.</p>
      )}

      {!isLoading && products && products.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Category</th>
              <th className="py-2 font-medium">Price</th>
              <th className="py-2 font-medium">Stock</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="py-3">{p.name}</td>
                <td className="py-3 text-gray-500">{p.categories?.name ?? "—"}</td>
                <td className="py-3 text-maroon font-medium">{formatINR(p.price_paise)}</td>
                <td className="py-3">{p.stock}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[p.status]}`}>{p.status}</span>
                </td>
                <td className="py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-maroon"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={form.id ? "Edit product" : "New product"}>
        <div className="space-y-3">
          <input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">No category</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Short description" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductForm["status"] })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_gift_builder_compatible} onChange={(e) => setForm({ ...form, is_gift_builder_compatible: e.target.checked })} />
            Allow this product in the Gift Box Builder
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="w-full bg-maroon text-white rounded-lg py-2 text-sm hover:bg-maroon-dark disabled:opacity-40 transition">
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
