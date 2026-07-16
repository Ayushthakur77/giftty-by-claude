/**
 * Razorpay webhook — server-to-server payment confirmation. This path calls
 * the SAME confirmOrderPaid() function as the client-side verification path
 * (payments.functions.ts), so whichever one fires first does the complete
 * job (order status + invoice + coupon redemption + notification) and the
 * other is a safe idempotent no-op.
 */
import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/server/supabase-admin.server";
import { confirmOrderPaid } from "@/lib/payments.functions";

export const Route = createFileRoute("/api/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const rawBody = await request.text();

        if (webhookSecret) {
          const signature = request.headers.get("x-razorpay-signature") ?? "";
          const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
          const a = Buffer.from(expected);
          const b = Buffer.from(signature);
          if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 400 });
          }
        }

        const payload = JSON.parse(rawBody);

        if (payload.event === "payment.captured") {
          const payment = payload.payload?.payment?.entity;
          const razorpayOrderId = payment?.order_id;
          const razorpayPaymentId = payment?.id;

          if (razorpayOrderId && razorpayPaymentId) {
            const { data: orderRow } = await supabaseAdmin
              .from("orders")
              .select("id")
              .eq("razorpay_order_id", razorpayOrderId)
              .maybeSingle();

            if (orderRow) {
              await confirmOrderPaid(orderRow.id, razorpayPaymentId);
            }
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
