import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/lib/use-session";
import { getOrCreateReferralCodeFn } from "@/lib/referral.functions";
import { supabase } from "@/lib/supabase-client";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/account/referrals")({ component: ReferralsPage });

function ReferralsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [copied, setCopied] = useState(false);

  const { data: referral } = useQuery({
    queryKey: ["referral-code", user?.id],
    queryFn: () => getOrCreateReferralCodeFn({ data: { userId: user!.id } }),
    enabled: !!user,
  });

  const { data: redemptions } = useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("referral_redemptions").select("*").eq("referrer_user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const shareLink = referral && typeof window !== "undefined" ? `${window.location.origin}/auth/sign-up?ref=${referral.code}` : "";

  function copyLink() {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (sessionLoading) return null;
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Sign in to view your referral link.</p>
        <Link to="/auth/sign-in" className="text-maroon hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-2">Refer a Friend</h1>
      <p className="text-sm text-gray-500 mb-6">
        Share your link — when a friend signs up and places their first order, you both get wallet credit.
      </p>

      {referral && (
        <div className="border border-gold/30 bg-cream/40 rounded-xl p-4 mb-8">
          <p className="text-xs text-gray-500 mb-1">Your referral code</p>
          <p className="font-mono font-semibold text-maroon text-lg mb-3">{referral.code}</p>
          <div className="flex gap-2">
            <input readOnly value={shareLink} className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white" />
            <button onClick={copyLink} className="bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition flex items-center gap-1">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <h2 className="font-medium text-gray-900 mb-3">Your referrals</h2>
      {redemptions?.length === 0 && <p className="text-gray-400 text-sm">No referrals yet — share your link to get started!</p>}
      {redemptions && redemptions.length > 0 && (
        <div className="space-y-2">
          {redemptions.map((r) => (
            <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 text-sm">
              <span className="text-gray-600">Joined {new Date(r.created_at).toLocaleDateString("en-IN")}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${r.status === "rewarded" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {r.status === "rewarded" ? `+₹${r.referrer_reward_paise / 100} earned` : "Pending first order"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
