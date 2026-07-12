import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/admin/dashboard")({ component: DashboardPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [orders, products, categories] = await Promise.all([
        supabase.from("orders").select("status, total_paise, created_at"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);

      const allOrders = orders.data ?? [];
      const totalRevenue = allOrders.reduce((sum, o) => sum + o.total_paise, 0);
      const pendingCount = allOrders.filter((o) => o.status === "pending" || o.status === "confirmed").length;

      return {
        totalOrders: allOrders.length,
        totalRevenue,
        pendingCount,
        productCount: products.count ?? 0,
        categoryCount: categories.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Revenue", value: data ? formatINR(data.totalRevenue) : "…" },
    { label: "Total Orders", value: data?.totalOrders ?? "…" },
    { label: "Pending / Confirmed", value: data?.pendingCount ?? "…" },
    { label: "Products", value: data?.productCount ?? "…" },
    { label: "Categories", value: data?.categoryCount ?? "…" },
  ];

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className="text-xl font-bold text-maroon mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
