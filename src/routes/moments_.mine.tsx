import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Pencil, Trash2, Share2, Plus } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { listMyMomentPages, deleteMomentPage } from "@/lib/moments-catalog";

export const Route = createFileRoute("/moments_/mine")({ component: MyMomentsPage });

function MyMomentsPage() {
  const { user, loading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["my-moment-pages", user?.id],
    queryFn: () => listMyMomentPages(user!.id),
    enabled: !!user,
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this surprise page? The link will stop working immediately.")) return;
    setDeletingId(id);
    try {
      await deleteMomentPage(id);
      queryClient.invalidateQueries({ queryKey: ["my-moment-pages", user?.id] });
    } finally {
      setDeletingId(null);
    }
  }

  if (sessionLoading) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-700 font-medium mb-6">Sign in to see the surprise pages you've created.</p>
        <Link
          to="/auth/sign-in"
          search={{ redirect: "/moments/mine" } as any}
          className="inline-block bg-maroon text-white px-6 py-2.5 rounded-sm font-semibold text-sm hover:bg-maroon-dark transition"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f1f3f6] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-xl font-bold text-gray-900">My Surprise Pages</h1>
          <Link to="/moments" className="flex items-center gap-1 text-xs font-semibold bg-maroon text-white px-3 py-1.5 rounded-full hover:bg-maroon-dark transition">
            <Plus className="w-3.5 h-3.5" /> New
          </Link>
        </div>

        {isLoading && <div className="text-center text-gray-400 text-sm py-10">Loading…</div>}

        {!isLoading && pages && pages.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-100 text-center py-16 px-4">
            <p className="text-gray-500 text-sm mb-4">You haven't created any surprise pages yet.</p>
            <Link to="/moments" className="text-maroon font-semibold text-sm hover:underline">Browse templates →</Link>
          </div>
        )}

        {!isLoading && pages && pages.length > 0 && (
          <div className="space-y-3">
            {pages.map((p) => (
              <div key={p.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center text-white text-xl"
                  style={{ background: p.theme_color || "#7a1f3d" }}
                >
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.title || p.moments_templates?.title}</p>
                  <p className="text-xs text-gray-400">
                    {p.moments_templates?.title} · {p.views} view{p.views !== 1 ? "s" : ""} · {p.is_published ? "Published" : "Draft"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link to="/s/$slug" params={{ slug: p.slug }} aria-label="View" className="p-2 text-gray-400 hover:text-maroon transition">
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link to="/moments/edit/$pageSlug" params={{ pageSlug: p.slug }} aria-label="Edit" className="p-2 text-gray-400 hover:text-maroon transition">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/s/${p.slug}`);
                    }}
                    aria-label="Copy share link"
                    className="p-2 text-gray-400 hover:text-maroon transition"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    aria-label="Delete"
                    className="p-2 text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
