import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({ component: AdminCouponsPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

type CouponForm = {
  id?: string;
  code: string;
  discount_type: "flat" | "percent";
  discount_value: string; // ₹ if flat, whole % if percent
  max_discount: string; // ₹, only used for percent
  min_order: string; // ₹
  usage_limit: string; // blank = unlimited
  per_user_limit: string;
  first_order_only: boolean;
  status: "active" | "disabled";
};

const EMPTY_FORM: CouponForm = {
  code: "", discount_type: "flat", discount_value: "", max_discount: "", min_order: "0",
  usage_limit: "", per_user_limit: "1", first_order_only: false, status: "active",
};

function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
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
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_type === "flat" ? (c.discount_value / 100).toString() : c.discount_value.toString(),
      max_discount: c.max_discount_paise ? (c.max_discount_paise / 100).toString() : "",
      min_order: (c.min_order_paise / 100).toString(),
      usage_limit: c.usage_limit?.toString() ?? "",
      per_user_limit: c.per_user_limit.toString(),
      first_order_only: c.first_order_only,
      status: c.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.discount_value) {
      setError("Code and discount value are required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === "flat" ? Math.round(parseFloat(form.discount_value) * 100) : parseInt(form.discount_value, 10),
      max_discount_paise: form.discount_type === "percent" && form.max_discount ? Math.round(parseFloat(form.max_discount) * 100) : null,
      min_order_paise: Math.round(parseFloat(form.min_order || "0") * 100),
      usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
      per_user_limit: parseInt(form.per_user_limit, 10) || 1,
      first_order_only: form.first_order_only,
      status: form.status,
    };

    const result = form.id
      ? await supabase.from("coupons").update(payload).eq("id", form.id)
      : await supabase.from("coupons").insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.code === "23505" ? "This coupon code already exists" : result.error.message);
      return;
    }
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Coupons {coupons && `(${coupons.length})`}
        </h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition">
          <Plus className="w-4 h-4" /> New coupon
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && coupons?.length === 0 && <p className="text-gray-400 text-sm">No coupons yet.</p>}

      {!isLoading && coupons && coupons.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-medium">Code</th>
              <th className="py-2 font-medium">Discount</th>
              <th className="py-2 font-medium">Min order</th>
              <th className="py-2 font-medium">Usage</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-3 font-mono font-medium">{c.code}</td>
                <td className="py-3">
                  {c.discount_type === "flat" ? formatINR(c.discount_value) : `${c.discount_value}%`}
                  {c.max_discount_paise ? ` (max ${formatINR(c.max_discount_paise)})` : ""}
                </td>
                <td className="py-3 text-gray-500">{formatINR(c.min_order_paise)}</td>
                <td className="py-3 text-gray-500">{c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : " / ∞"}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{c.status}</span>
                </td>
                <td className="py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-maroon"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={form.id ? "Edit coupon" : "New coupon"}>
        <div className="space-y-3">
          <input placeholder="Code (e.g. WELCOME10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "flat" | "percent" })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="flat">Flat ₹ off</option>
              <option value="percent">% off</option>
            </select>
            <input
              placeholder={form.discount_type === "flat" ? "Amount (₹)" : "Percent (%)"}
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {form.discount_type === "percent" && (
            <input placeholder="Max discount cap (₹, optional)" type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          )}
          <input placeholder="Minimum order value (₹)" type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Total usage limit (blank = ∞)" type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Per-user limit" type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.first_order_only} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })} />
            First order only
          </label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "disabled" })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="w-full bg-maroon text-white rounded-lg py-2 text-sm hover:bg-maroon-dark disabled:opacity-40 transition">
            {saving ? "Saving…" : "Save coupon"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
