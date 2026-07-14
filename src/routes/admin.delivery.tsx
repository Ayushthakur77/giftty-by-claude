import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/admin/delivery")({ component: AdminDeliveryPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AdminDeliveryPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ charge: "", threshold: "", days: "", serviceable: true });

  const { data: charges, isLoading } = useQuery({
    queryKey: ["admin-delivery-charges"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_charges").select("*").order("state");
      return data ?? [];
    },
  });

  function startEdit(c: any) {
    setEditingId(c.id);
    setEditValues({
      charge: (c.charge_paise / 100).toString(),
      threshold: (c.free_shipping_threshold_paise / 100).toString(),
      days: c.estimated_days.toString(),
      serviceable: c.is_serviceable,
    });
  }

  async function saveEdit(id: string) {
    await supabase.from("delivery_charges").update({
      charge_paise: Math.round(parseFloat(editValues.charge) * 100),
      free_shipping_threshold_paise: Math.round(parseFloat(editValues.threshold) * 100),
      estimated_days: parseInt(editValues.days, 10) || 5,
      is_serviceable: editValues.serviceable,
    }).eq("id", id);
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-delivery-charges"] });
  }

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-2">Delivery Charges</h1>
      <p className="text-sm text-gray-500 mb-6">State-wise shipping rates. Click a row to edit.</p>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!isLoading && charges && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-medium">State</th>
              <th className="py-2 font-medium">Charge</th>
              <th className="py-2 font-medium">Free above</th>
              <th className="py-2 font-medium">Est. days</th>
              <th className="py-2 font-medium">Serviceable</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {charges.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                {editingId === c.id ? (
                  <>
                    <td className="py-2 font-medium">{c.state}</td>
                    <td className="py-2"><input type="number" value={editValues.charge} onChange={(e) => setEditValues({ ...editValues, charge: e.target.value })} className="w-20 border rounded px-2 py-1 text-sm" /></td>
                    <td className="py-2"><input type="number" value={editValues.threshold} onChange={(e) => setEditValues({ ...editValues, threshold: e.target.value })} className="w-24 border rounded px-2 py-1 text-sm" /></td>
                    <td className="py-2"><input type="number" value={editValues.days} onChange={(e) => setEditValues({ ...editValues, days: e.target.value })} className="w-16 border rounded px-2 py-1 text-sm" /></td>
                    <td className="py-2">
                      <input type="checkbox" checked={editValues.serviceable} onChange={(e) => setEditValues({ ...editValues, serviceable: e.target.checked })} />
                    </td>
                    <td className="py-2">
                      <button onClick={() => saveEdit(c.id)} className="text-maroon text-xs font-medium">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs ml-2">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 font-medium">{c.state}</td>
                    <td className="py-2">{formatINR(c.charge_paise)}</td>
                    <td className="py-2">{formatINR(c.free_shipping_threshold_paise)}</td>
                    <td className="py-2">{c.estimated_days}d</td>
                    <td className="py-2">{c.is_serviceable ? "✓" : <span className="text-red-500">✗</span>}</td>
                    <td className="py-2"><button onClick={() => startEdit(c)} className="text-gray-400 hover:text-maroon text-xs">Edit</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
