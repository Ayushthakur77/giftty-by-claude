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

  async function quickToggle(id: string, current: boolean) {
    await supabase.from("delivery_charges").update({ is_serviceable: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-delivery-charges"] });
  }

  async function disableAll() {
    if (!confirm("Turn OFF delivery for every state? You can re-enable specific states after.")) return;
    await supabase.from("delivery_charges").update({ is_serviceable: false }).neq("id", "");
    queryClient.invalidateQueries({ queryKey: ["admin-delivery-charges"] });
  }

  async function enableAll() {
    await supabase.from("delivery_charges").update({ is_serviceable: true }).neq("id", "");
    queryClient.invalidateQueries({ queryKey: ["admin-delivery-charges"] });
  }

  const enabledCount = charges?.filter((c) => c.is_serviceable).length ?? 0;

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-2">Delivery Charges</h1>
      <p className="text-sm text-gray-500 mb-1">
        State-wise shipping rates. Uncheck "Serviceable" for any state to stop selling there — checkout will
        block orders to that state entirely.
      </p>
      {charges && <p className="text-xs text-gray-400 mb-4">Currently shipping to {enabledCount} of {charges.length} states.</p>}

      <div className="flex gap-3 mb-4">
        <button onClick={disableAll} className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:border-red-400 hover:text-red-600 transition">
          Turn off everywhere
        </button>
        <button onClick={enableAll} className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:border-green-400 hover:text-green-600 transition">
          Turn on everywhere
        </button>
        <span className="text-xs text-gray-400 self-center">Tip: to sell in Delhi only, click "Turn off everywhere" then check just Delhi below.</span>
      </div>

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
              <tr key={c.id} className={`border-b border-gray-50 ${!c.is_serviceable ? "opacity-50" : ""}`}>
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
                    <td className="py-2">
                      <input type="checkbox" checked={c.is_serviceable} onChange={() => quickToggle(c.id, c.is_serviceable)} />
                    </td>
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
