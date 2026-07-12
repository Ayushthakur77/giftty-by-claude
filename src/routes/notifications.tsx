import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user, loading: sessionLoading } = useSession();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (sessionLoading) return null;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Sign in to view your notifications.</p>
        <Link to="/auth/sign-in" className="text-maroon hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Notifications</h1>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!isLoading && notifications?.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          No notifications yet.
        </div>
      )}

      {!isLoading && notifications && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 rounded-xl border ${n.read_at ? "border-gray-100" : "border-maroon/20 bg-cream/50"}`}>
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              {n.body && <p className="text-sm text-gray-500 mt-1">{n.body}</p>}
              <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
