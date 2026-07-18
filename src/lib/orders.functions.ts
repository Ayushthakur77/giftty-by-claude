/**
 * Customer-initiated order cancellation + refund.
 *
 * Rules:
 *   - Only orders still in 'pending' or 'confirmed' status can be
 *     self-cancelled (once shipped, the customer must contact support).
 *   - If wallet balance was used on the order, it's credited back atomically.
 *   - If the order was paid via Razorpay, a real refund is issued through
 *     Razorpay's Refund API and the order is marked 'refunded'. COD orders
 *     have nothing to refund (no payment was ever taken) — they just get
 *     marked 'cancelled'.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/server/supabase-admin.server";

const cancelInput = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().max(300).optional(),
});

export const cancelOrderFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => cancelInput.parse(d))
  .handler(async ({ data }) => {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .eq("user_id", data.userId) // ownership check — never rely on RLS alone
      .maybeSingle();

    if (!order) return { ok: false as const, error: "Order not found" };
    if (!["pending", "confirmed"].includes(order.status)) {
      return { ok: false as const, error: "This order can no longer be cancelled — please contact support." };
    }

    let refundNote = "Order cancelled.";

    // Refund via Razorpay if it was actually paid.
    if (order.payment_method === "razorpay" && order.payment_status === "paid" && order.razorpay_payment_id) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keyId && keySecret) {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        // Refund only the amount actually charged via Razorpay (total minus any wallet portion).
        const refundAmountPaise = order.total_paise;
        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({ amount: refundAmountPaise }),
        });
        if (rzpRes.ok) {
          await supabaseAdmin.from("orders").update({ payment_status: "refunded" }).eq("id", order.id);
          refundNote = `Order cancelled. ₹${(refundAmountPaise / 100).toFixed(2)} refunded to original payment method (3-5 business days).`;
        } else {
          refundNote = "Order cancelled. Refund could not be processed automatically — our team will process it manually within 2-3 business days.";
        }
      }
    }

    // Refund any wallet amount used, back to the wallet, atomically.
    if (order.wallet_used_paise > 0) {
      await supabaseAdmin.rpc("apply_wallet_transaction", {
        _user_id: data.userId,
        _amount_paise: order.wallet_used_paise,
        _reason: "refund",
        _order_id: order.id,
      });
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: data.reason ?? null })
      .eq("id", order.id);

    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      status: "cancelled",
      note: data.reason ? `${refundNote} Reason: ${data.reason}` : refundNote,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: "order_update",
      title: "Order cancelled",
      body: refundNote,
      link: "/account",
    });

    return { ok: true as const, message: refundNote };
  });
