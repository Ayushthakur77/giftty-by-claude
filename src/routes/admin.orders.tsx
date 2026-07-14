import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Modal } from "@/components/Modal";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrdersPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_FLOW = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: orderRows } = await supabase
        .from("orders")
        .select("*, addresses(full_name, city, state)")
        .order("created_at", { ascending: false });

      if (!orderRows || orderRows.length === 0) return [];

      const userIds = [...new Set(orderRows.map((o) => o.user_id))];
      const { data: profileRows } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]));

      return orderRows.map((o) => ({ ...o, customerName: profileMap.get(o.user_id) ?? null }));
    },
  });

  const { data: detailOrder } = useQuery({
    queryKey: ["admin-order-detail", detailOrderId],
    queryFn: async () => {
      const [order, items, history] = await Promise.all([
        supabase.from("orders").select("*, addresses(*)").eq("id", detailOrderId!).single(),
        supabase.from("order_items").select("*").eq("order_id", detailOrderId!),
        supabase.from("order_status_history").select("*").eq("order_id", detailOrderId!).order("created_at"),
      ]);
      return { order: order.data, items: items.data ?? [], history: history.data ?? [] };
    },
    enabled: !!detailOrderId,
  });

  async function updateStatus(orderId: string, newStatus: string) {
    await supabase.from("orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
    await supabase.from("order_status_history").insert({ order_id: orderId, status: newStatus, note: "Updated by admin" });

    // Notify the customer.
    const order = orders?.find((o) => o.id === orderId);
    if (order) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        type: "order_update",
        title: `Order ${newStatus}`,
        body: `Your order #${order.order_number} is now ${newStatus}.`,
        link: "/account",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
  }

  const filtered = orders?.filter((o) => statusFilter === "all" || o.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Orders {orders && `(${orders.length})`}
        </h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && filtered?.length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}

      {!isLoading && filtered && filtered.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-medium">Order</th>
              <th className="py-2 font-medium">Customer</th>
              <th className="py-2 font-medium">Total</th>
              <th className="py-2 font-medium">Payment</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o: any) => (
              <tr key={o.id} className="border-b border-gray-50">
                <td className="py-3">
                  <p className="font-medium">#{o.order_number}</p>
                  <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                </td>
                <td className="py-3 text-gray-600">
                  {o.customerName ?? "—"}<br />
                  <span className="text-xs text-gray-400">{o.addresses?.city}, {o.addresses?.state}</span>
                </td>
                <td className="py-3 text-maroon font-medium">{formatINR(o.total_paise)}</td>
                <td className="py-3 text-xs uppercase text-gray-500">{o.payment_method} · {o.payment_status}</td>
                <td className="py-3">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[o.status]}`}
                  >
                    {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-3">
                  <button onClick={() => setDetailOrderId(o.id)} className="text-gray-400 hover:text-maroon"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!detailOrderId} onOpenChange={(o) => !o && setDetailOrderId(null)} title={`Order #${detailOrder?.order.order_number ?? ""}`}>
        {detailOrder && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-1">Delivery Address</p>
              <p className="text-gray-600">
                {detailOrder.order.addresses?.full_name}, {detailOrder.order.addresses?.line1}, {detailOrder.order.addresses?.city}, {detailOrder.order.addresses?.state} — {detailOrder.order.addresses?.postal_code}
                <br />{detailOrder.order.addresses?.phone}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Items</p>
              <ul className="text-gray-600 space-y-1">
                {detailOrder.items.map((it: any) => (
                  <li key={it.id}>• {it.name_snapshot} × {it.quantity} — {formatINR(it.line_total_paise)}</li>
                ))}
              </ul>
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <p className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatINR(detailOrder.order.subtotal_paise)}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatINR(detailOrder.order.shipping_paise)}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatINR(detailOrder.order.tax_paise)}</span></p>
              {detailOrder.order.discount_paise > 0 && (
                <p className="flex justify-between text-green-600"><span>Discount</span><span>-{formatINR(detailOrder.order.discount_paise)}</span></p>
              )}
              <p className="flex justify-between font-semibold text-maroon"><span>Total</span><span>{formatINR(detailOrder.order.total_paise)}</span></p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">History</p>
              <ul className="text-gray-500 text-xs space-y-1">
                {detailOrder.history.map((h: any) => (
                  <li key={h.id}>{new Date(h.created_at).toLocaleString("en-IN")} — {h.status} {h.note && `(${h.note})`}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
