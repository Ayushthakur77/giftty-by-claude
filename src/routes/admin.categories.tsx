import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategoriesPage });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type CategoryForm = {
  id?: string;
  name: string;
  parent_id: string;
  is_festival: boolean;
  is_recipient_category: boolean;
  status: "active" | "draft" | "archived";
};

const EMPTY_FORM: CategoryForm = {
  name: "", parent_id: "", is_festival: false, is_recipient_category: false, status: "active",
};

function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("display_order").order("name");
      return data ?? [];
    },
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setForm({
      id: c.id,
      name: c.name,
      parent_id: c.parent_id ?? "",
      is_festival: c.is_festival,
      is_recipient_category: c.is_recipient_category,
      status: c.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name),
      parent_id: form.parent_id || null,
      is_festival: form.is_festival,
      is_recipient_category: form.is_recipient_category,
      status: form.status,
    };

    const result = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] }); // also refresh public nav/homepage caches
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products in it will become uncategorized.")) return;
    await supabase.from("categories").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Categories {categories && `(${categories.length})`}
        </h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition">
          <Plus className="w-4 h-4" /> New category
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && categories?.length === 0 && (
        <p className="text-gray-400 text-sm">No categories yet — add one to see it appear on the storefront automatically.</p>
      )}

      {!isLoading && categories && categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {c.parent_id && "↳ "}{c.name}
                  {c.is_festival && <span className="ml-2 text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">Festival</span>}
                </p>
                <p className="text-xs text-gray-400">/{c.slug}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-maroon"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={form.id ? "Edit category" : "New category"}>
        <div className="space-y-3">
          <input placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">No parent (top-level)</option>
            {categories?.filter((c) => c.id !== form.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CategoryForm["status"] })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_festival} onChange={(e) => setForm({ ...form, is_festival: e.target.checked })} />
            Festival category
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_recipient_category} onChange={(e) => setForm({ ...form, is_recipient_category: e.target.checked })} />
            Recipient category (For Him / For Mom, etc.)
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="w-full bg-maroon text-white rounded-lg py-2 text-sm hover:bg-maroon-dark disabled:opacity-40 transition">
            {saving ? "Saving…" : "Save category"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
