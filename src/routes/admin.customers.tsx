import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/admin/customers")({ component: AdminCustomersPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AdminCustomersPage() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (!profiles) return [];

      const { data: orders } = await supabase.from("orders").select("user_id, total_paise");
      const statsByUser = new Map<string, { count: number; total: number }>();
      for (const o of orders ?? []) {
        const cur = statsByUser.get(o.user_id) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += o.total_paise;
        statsByUser.set(o.user_id, cur);
      }

      return profiles.map((p) => ({
        ...p,
        orderCount: statsByUser.get(p.id)?.count ?? 0,
        totalSpent: statsByUser.get(p.id)?.total ?? 0,
      }));
    },
  });

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">
        Customers {customers && `(${customers.length})`}
      </h1>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && customers?.length === 0 && <p className="text-gray-400 text-sm">No customers yet.</p>}

      {!isLoading && customers && customers.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Joined</th>
              <th className="py-2 font-medium">Orders</th>
              <th className="py-2 font-medium">Total spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-3">{c.full_name ?? "—"}</td>
                <td className="py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                <td className="py-3">{c.orderCount}</td>
                <td className="py-3 text-maroon font-medium">{formatINR(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
