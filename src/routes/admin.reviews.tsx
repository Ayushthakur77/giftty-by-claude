import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Star, Check, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/reviews")({ component: AdminReviewsPage });

function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", statusFilter],
    queryFn: async () => {
      let query = supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data } = await query;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "approved" | "rejected") {
    await supabase.from("reviews").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Reviews {reviews && `(${reviews.length})`}
        </h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && reviews?.length === 0 && <p className="text-gray-400 text-sm">No reviews here.</p>}

      {!isLoading && reviews && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">{r.products?.name}</p>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
              {r.title && <p className="text-sm text-gray-800">{r.title}</p>}
              {r.body && <p className="text-sm text-gray-600 mt-1">{r.body}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === "approved" ? "bg-green-100 text-green-700" :
                  r.status === "rejected" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                }`}>{r.status}</span>
                <div className="flex gap-3">
                  {r.status !== "approved" && (
                    <button onClick={() => setStatus(r.id, "approved")} className="text-green-600 hover:text-green-700" title="Approve"><Check className="w-4 h-4" /></button>
                  )}
                  {r.status !== "rejected" && (
                    <button onClick={() => setStatus(r.id, "rejected")} className="text-red-500 hover:text-red-600" title="Reject"><X className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
