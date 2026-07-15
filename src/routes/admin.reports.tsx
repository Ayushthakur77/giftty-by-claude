import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/admin/reports")({ component: AdminReportsPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AdminReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const [ordersRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("order_items").select("name_snapshot, quantity, line_total_paise, product_id"),
      ]);
      const orders = ordersRes.data ?? [];
      const items = itemsRes.data ?? [];

      const byStatus: Record<string, number> = {};
      for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

      const revenueByProduct = new Map<string, { name: string; revenue: number; qty: number }>();
      for (const it of items) {
        const key = it.product_id ?? it.name_snapshot;
        const cur = revenueByProduct.get(key) ?? { name: it.name_snapshot, revenue: 0, qty: 0 };
        cur.revenue += it.line_total_paise;
        cur.qty += it.quantity;
        revenueByProduct.set(key, cur);
      }
      const topProducts = [...revenueByProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      const paidOrders = orders.filter((o) => o.payment_status === "paid" || o.payment_method === "cod");
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_paise, 0);
      const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      return { byStatus, topProducts, totalRevenue, avgOrderValue, totalOrders: orders.length };
    },
  });

  if (isLoading || !data) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400">Total Revenue</p>
          <p className="text-xl font-bold text-maroon mt-1">{formatINR(data.totalRevenue)}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400">Avg Order Value</p>
          <p className="text-xl font-bold text-maroon mt-1">{formatINR(Math.round(data.avgOrderValue))}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400">Total Orders</p>
          <p className="text-xl font-bold text-maroon mt-1">{data.totalOrders}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-medium text-gray-900 mb-3">Orders by status</h2>
          <div className="space-y-2">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className="text-sm w-24 capitalize text-gray-600">{status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-maroon h-2 rounded-full" style={{ width: `${(count / data.totalOrders) * 100}%` }} />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-medium text-gray-900 mb-3">Top products by revenue</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.topProducts.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">{p.name}</td>
                  <td className="py-2 text-gray-400 text-xs">{p.qty} sold</td>
                  <td className="py-2 text-maroon font-medium text-right">{formatINR(p.revenue)}</td>
                </tr>
              ))}
              {data.topProducts.length === 0 && (
                <tr><td className="py-2 text-gray-400 text-sm">No sales yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
