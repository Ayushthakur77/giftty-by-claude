import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/admin/ai-logs")({ component: AdminAiLogsPage });

function AdminAiLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-ai-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_logs").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const failureCount = logs?.filter((l) => !l.success).length ?? 0;

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-2">AI Logs</h1>
      {logs && logs.length > 0 && (
        <p className="text-sm text-gray-500 mb-6">{failureCount} failure{failureCount !== 1 ? "s" : ""} in the last {logs.length} requests</p>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && logs?.length === 0 && <p className="text-gray-400 text-sm">No AI requests yet.</p>}

      {!isLoading && logs && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className={`border rounded-xl p-3 text-sm ${l.success ? "border-gray-100" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{l.feature}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${l.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {l.success ? "success" : "failed"}
                </span>
              </div>
              {l.input_summary && <p className="text-gray-500 text-xs mt-1">"{l.input_summary}"</p>}
              {l.error_message && <p className="text-red-600 text-xs mt-1 font-mono break-all">{l.error_message}</p>}
              <p className="text-gray-400 text-xs mt-1">{new Date(l.created_at).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
