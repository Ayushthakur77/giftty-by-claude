import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/server/supabase-admin.server";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const getOrCreateReferralCodeFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("referral_codes")
      .select("code")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (existing) return { code: existing.code };

    // Retry a few times in the unlikely event of a collision (unique constraint on code).
    for (let i = 0; i < 5; i++) {
      const code = randomCode();
      const { error } = await supabaseAdmin.from("referral_codes").insert({ user_id: data.userId, code });
      if (!error) return { code };
    }
    throw new Error("Could not generate a referral code — please try again.");
  });

const recordSignupInput = z.object({ referralCode: z.string().min(4).max(20), newUserId: z.string().uuid() });

/**
 * Called right after a new user signs up if they arrived via a ?ref=CODE link.
 * Creates a pending referral_redemptions row — both parties are rewarded
 * later, once the referred user completes their first order (see
 * maybeRewardReferral below), to avoid rewarding signups with no real intent.
 */
export const recordReferralSignupFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => recordSignupInput.parse(d))
  .handler(async ({ data }) => {
    const { data: referrer } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .eq("code", data.referralCode.toUpperCase())
      .maybeSingle();

    if (!referrer || referrer.user_id === data.newUserId) return { ok: false as const };

    const { error } = await supabaseAdmin.from("referral_redemptions").insert({
      referrer_user_id: referrer.user_id,
      referred_user_id: data.newUserId,
    });
    // Unique constraint on referred_user_id means this silently no-ops if already recorded — fine.
    return { ok: !error };
  });

/**
 * Server-only (not client-callable) — invoked from order-confirmation code
 * paths after a customer's order is confirmed. Rewards both referrer and
 * referred user via the wallet, once, on the referred user's first order.
 */
export const maybeRewardReferral = createServerOnlyFn(async (userId: string) => {
  const { data: redemption } = await supabaseAdmin
    .from("referral_redemptions")
    .select("*")
    .eq("referred_user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!redemption) return;

  // Only reward on the user's FIRST confirmed order.
  const { count } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["confirmed", "shipped", "delivered"]);

  if ((count ?? 0) !== 1) return; // not their first order (or something went wrong)

  await supabaseAdmin.rpc("apply_wallet_transaction", {
    _user_id: redemption.referrer_user_id,
    _amount_paise: redemption.referrer_reward_paise,
    _reason: "referral_bonus",
  });
  await supabaseAdmin.rpc("apply_wallet_transaction", {
    _user_id: redemption.referred_user_id,
    _amount_paise: redemption.referred_reward_paise,
    _reason: "referral_bonus",
  });
  await supabaseAdmin.from("referral_redemptions").update({ status: "rewarded" }).eq("id", redemption.id);

  await supabaseAdmin.from("notifications").insert([
    { user_id: redemption.referrer_user_id, type: "system", title: "Referral bonus!", body: `You earned ₹${redemption.referrer_reward_paise / 100} in wallet credit for referring a friend.` },
    { user_id: redemption.referred_user_id, type: "system", title: "Welcome bonus!", body: `You earned ₹${redemption.referred_reward_paise / 100} in wallet credit for using a referral code.` },
  ]);
});
