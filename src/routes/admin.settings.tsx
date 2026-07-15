import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettingsPage });

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
      return data;
    },
  });

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await supabase.from("store_settings").update({
      store_name: form.store_name,
      support_email: form.support_email,
      support_phone: form.support_phone,
      business_address: form.business_address,
      gst_number: form.gst_number,
      gst_percent: parseFloat(form.gst_percent),
      instagram_url: form.instagram_url,
      facebook_url: form.facebook_url,
      maintenance_mode: form.maintenance_mode,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["admin-store-settings"] });
  }

  if (isLoading || !form) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Store Settings</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Store name</label>
          <input value={form.store_name ?? ""} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Support email</label>
            <input value={form.support_email ?? ""} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Support phone</label>
            <input value={form.support_phone ?? ""} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Business address</label>
          <textarea value={form.business_address ?? ""} onChange={(e) => setForm({ ...form, business_address: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">GST number</label>
            <input value={form.gst_number ?? ""} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">GST %</label>
            <input type="number" value={form.gst_percent ?? ""} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Instagram URL</label>
            <input value={form.instagram_url ?? ""} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Facebook URL</label>
            <input value={form.facebook_url ?? ""} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.maintenance_mode} onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })} />
          Maintenance mode (shows a "we'll be back soon" message to customers — not yet enforced on the storefront)
        </label>

        {saved && <p className="text-green-600 text-sm">Saved!</p>}

        <button onClick={handleSave} disabled={saving} className="bg-maroon text-white px-6 py-2 rounded-lg text-sm hover:bg-maroon-dark disabled:opacity-40 transition">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
