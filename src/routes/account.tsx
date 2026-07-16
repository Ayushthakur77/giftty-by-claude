import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/account")({ component: AccountPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AccountPage() {
  const { user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [birthday, setBirthday] = useState("");
  const [birthdayOptIn, setBirthdayOptIn] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["my-wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("balance_paise").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setBirthday(profile.birthday ?? "");
      setBirthdayOptIn(profile.birthday_reminder_opt_in ?? false);
    }
  }, [profile]);

  async function handleSaveBirthday() {
    if (!user) return;
    setSavingBirthday(true);
    await supabase.from("profiles").update({ birthday: birthday || null, birthday_reminder_opt_in: birthdayOptIn }).eq("id", user.id);
    setSavingBirthday(false);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (sessionLoading) return null;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Sign in to view your account.</p>
        <Link to="/auth/sign-in" className="text-maroon hover:underline">Sign in</Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">
            {profile?.full_name ?? "My Account"}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-maroon">
          Sign out
        </button>
      </div>

      {wallet && wallet.balance_paise > 0 && (
        <div className="border border-gold/30 bg-cream/40 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm text-gray-700">Wallet balance</span>
          <span className="font-semibold text-maroon">{formatINR(wallet.balance_paise)}</span>
        </div>
      )}

      <div className="border border-gray-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-gray-900 mb-2">Birthday reminder</p>
        <div className="flex items-center gap-3">
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={birthdayOptIn} onChange={(e) => setBirthdayOptIn(e.target.checked)} />
            Remind me
          </label>
          <button onClick={handleSaveBirthday} disabled={savingBirthday} className="text-sm text-maroon hover:underline disabled:opacity-40">
            {savingBirthday ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex gap-6 text-sm text-gray-500 border-b border-gray-100 mb-6">
        <span className="pb-2 border-b-2 border-maroon text-maroon font-medium">Orders</span>
        <Link to="/wishlist" className="pb-2 hover:text-maroon">Wishlist</Link>
        <Link to="/notifications" className="pb-2 hover:text-maroon">Notifications</Link>
        <Link to="/account/referrals" className="pb-2 hover:text-maroon">Refer a Friend</Link>
      </div>

      {orders?.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No orders yet.
          <Link to="/" className="text-maroon hover:underline block mt-2">Start shopping</Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">#{o.order_number}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                {o.status}
              </span>
              <p className="font-medium text-maroon">{formatINR(o.total_paise)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
