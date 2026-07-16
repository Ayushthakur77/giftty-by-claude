/**
 * GIFTTY v2 — Razorpay payment server functions.
 *
 * v1 post-mortem lesson applied: the webhook and the client-side payment
 * callback are TWO independent triggers that can each fire for the same
 * payment. In v1, only the client path did the invoice/coupon/notification
 * side effects, so a customer who paid but never returned to the tab got a
 * "paid" order with no invoice. Here, both paths call the SAME
 * confirmOrderPaid() function, which is idempotent (guarded on
 * payment_status still being 'pending') — whichever path fires first does
 * the complete job, the second is a safe no-op.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/server/supabase-admin.server";
import { loadCatalogSnapshot, loadDeliveryCharges } from "@/server/catalog-repo.server";
import { priceCart, computeShipping, computeTax } from "@/lib/pricing";
import type { CartLine } from "@/lib/pricing";
import { cartLineSchema, generateOrderNumber } from "@/lib/checkout.functions";
import { maybeRewardReferral } from "@/lib/referral.functions";

const initiateInput = z.object({
  userId: z.string().uuid(),
  addressId: z.string().uuid(),
  lines: z.array(cartLineSchema).min(1).max(50),
  couponCode: z.string().min(2).max(30).optional(),
  useWallet: z.boolean().optional(),
});

export const initiateRazorpayCheckoutFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => initiateInput.parse(d))
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return { ok: false as const, error: "Online payment is not configured yet — please use Cash on Delivery." };
    }

    // Ownership check — defense in depth on top of RLS.
    const { data: addr } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq("id", data.addressId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!addr) return { ok: false as const, error: "Address not found" };

    const lines = data.lines as CartLine[];
    const snap = await loadCatalogSnapshot(lines);
    const priced = priceCart(lines, snap);
    if (priced.hasErrors) {
      const firstError = priced.lines.find((l) => l.error)?.error ?? "Some items could not be priced";
      return { ok: false as const, error: firstError };
    }

    const deliveryCharges = await loadDeliveryCharges();
    const shippingResult = computeShipping(addr.state, priced.subtotalPaise, deliveryCharges);
    if (shippingResult.error) return { ok: false as const, error: shippingResult.error };

    let discountPaise = 0;
    let couponId: string | null = null;
    if (data.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", data.couponCode.toUpperCase())
        .eq("status", "active")
        .maybeSingle();
      if (!coupon) return { ok: false as const, error: "Invalid or expired coupon" };
      if (priced.subtotalPaise < coupon.min_order_paise) {
        return { ok: false as const, error: `Minimum order value for this coupon is ${coupon.min_order_paise / 100} rupees` };
      }
      discountPaise =
        coupon.discount_type === "flat"
          ? coupon.discount_value
          : Math.min(Math.round((priced.subtotalPaise * coupon.discount_value) / 100), coupon.max_discount_paise ?? Number.MAX_SAFE_INTEGER);
      couponId = coupon.id;
    }

    const taxPaise = computeTax(priced.subtotalPaise - discountPaise, 18);
    let totalPaise = priced.subtotalPaise - discountPaise + shippingResult.shippingPaise + taxPaise;

    // Wallet is applied here as a discount toward the amount charged via Razorpay,
    // but is only actually DEBITED once payment succeeds (in confirmOrderPaid) —
    // debiting now would incorrectly charge the wallet for abandoned/failed payments.
    // Razorpay requires a minimum chargeable amount, so at least ₹1 is always charged online.
    let walletUsedPaise = 0;
    if (data.useWallet) {
      const { data: wallet } = await supabaseAdmin.from("wallets").select("balance_paise").eq("user_id", data.userId).maybeSingle();
      const available = wallet?.balance_paise ?? 0;
      walletUsedPaise = Math.min(available, Math.max(0, totalPaise - 100));
      totalPaise -= walletUsedPaise;
    }

    const orderNumber = generateOrderNumber();

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.userId,
        address_id: data.addressId,
        order_number: orderNumber,
        status: "pending",
        payment_method: "razorpay",
        payment_status: "pending",
        subtotal_paise: priced.subtotalPaise,
        shipping_paise: shippingResult.shippingPaise,
        tax_paise: taxPaise,
        discount_paise: discountPaise,
        wallet_used_paise: walletUsedPaise,
        total_paise: totalPaise,
        coupon_id: couponId,
      })
      .select()
      .single();

    if (orderErr || !order) return { ok: false as const, error: "Failed to create order" };

    // Store the cart lines so confirmOrderPaid can write order_items once payment succeeds.
    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      status: "pending",
      note: JSON.stringify({ pendingLines: lines }),
    });

    // Create the Razorpay order via their REST API (server-to-server, secret never leaves here).
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalPaise, currency: "INR", receipt: orderNumber }),
    });

    if (!rzpRes.ok) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return { ok: false as const, error: "Could not start payment — please try again." };
    }

    const rzpOrder = await rzpRes.json();

    await supabaseAdmin.from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      razorpay_order_id: rzpOrder.id,
      amount_paise: totalPaise,
      status: "created",
    });

    return {
      ok: true as const,
      orderId: order.id,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      amountPaise: totalPaise,
      keyId, // public key ID only — safe to send to the browser
    };
  });

/**
 * The ONE place that performs all "payment confirmed" side effects.
 * Called by both the webhook and the client verification path. Idempotent —
 * only does work if the order is still 'pending'.
 */
const confirmOrderPaid = createServerOnlyFn(async (orderId: string, razorpayPaymentId: string) => {
  const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.payment_status === "paid") return { ok: true as const, alreadyProcessed: true };

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed", razorpay_payment_id: razorpayPaymentId, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("payment_status", "pending") // idempotency guard against a race between webhook and client callback
    .select()
    .maybeSingle();

  if (updateErr || !updated) return { ok: true as const, alreadyProcessed: true }; // someone else already confirmed it

  await supabaseAdmin.from("payments").update({ razorpay_payment_id: razorpayPaymentId, status: "captured" }).eq("order_id", orderId);
  await supabaseAdmin.from("order_status_history").insert({ order_id: orderId, status: "confirmed", note: "Payment captured (Razorpay)" });

  // Reconstruct order_items from the cart-lines snapshot stashed at initiation.
  const { data: historyRows } = await supabaseAdmin
    .from("order_status_history")
    .select("note")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .limit(1);

  let lines: CartLine[] = [];
  try {
    const parsed = JSON.parse(historyRows?.[0]?.note ?? "{}");
    lines = parsed.pendingLines ?? [];
  } catch {
    lines = [];
  }

  if (lines.length > 0) {
    const snap = await loadCatalogSnapshot(lines);
    const priced = priceCart(lines, snap);
    const orderItems = priced.lines.map((line) => {
      if (line.raw.type === "product") {
        return { order_id: orderId, item_type: "product", product_id: line.raw.productId, name_snapshot: line.descriptionSnapshot, unit_price_paise: line.unitPricePaise, quantity: line.quantity, line_total_paise: line.linePaise, personalization: line.raw.personalization ?? {} };
      }
      if (line.raw.type === "ready_box") {
        return { order_id: orderId, item_type: "ready_box", ready_box_id: line.raw.readyBoxId, name_snapshot: line.descriptionSnapshot, unit_price_paise: line.unitPricePaise, quantity: line.quantity, line_total_paise: line.linePaise, personalization: {} };
      }
      return { order_id: orderId, item_type: "custom_box", empty_box_id: line.raw.emptyBoxId, name_snapshot: line.descriptionSnapshot, unit_price_paise: line.unitPricePaise, quantity: 1, line_total_paise: line.linePaise, personalization: {}, custom_box_contents: { productIds: line.raw.productIds, ribbonId: line.raw.ribbonId, fillerId: line.raw.fillerId, greetingCardId: line.raw.greetingCardId, giftNote: line.raw.giftNote } };
      }
    );
    await supabaseAdmin.from("order_items").insert(orderItems);
  }

  // Debit the wallet now that payment has actually succeeded.
  if (order.wallet_used_paise > 0) {
    await supabaseAdmin.rpc("apply_wallet_transaction", {
      _user_id: order.user_id,
      _amount_paise: -order.wallet_used_paise,
      _reason: "order_payment",
      _order_id: orderId,
    });
  }

  // Redeem coupon atomically, if one was applied.
  if (order.coupon_id) {
    await supabaseAdmin.rpc("redeem_coupon", {
      _coupon_id: order.coupon_id,
      _user_id: order.user_id,
      _order_id: orderId,
      _discount_paise: order.discount_paise,
    });
  }

  const invoiceNumber = `INV-${order.order_number}`;
  await supabaseAdmin.from("invoices").insert({ order_id: orderId, invoice_number: invoiceNumber, gst_percent: 18 });

  await supabaseAdmin.from("notifications").insert({
    user_id: order.user_id,
    type: "order_update",
    title: "Payment successful!",
    body: `Your order #${order.order_number} has been confirmed.`,
    link: "/account",
  });

  await maybeRewardReferral(order.user_id);

  return { ok: true as const, alreadyProcessed: false };
});

const verifyInput = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const verifyRazorpayPaymentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => verifyInput.parse(d))
  .handler(async ({ data }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return { ok: false as const, error: "Payment verification not configured" };

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpaySignature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false as const, error: "Payment verification failed" };
    }

    const result = await confirmOrderPaid(data.orderId, data.razorpayPaymentId);
    if (!result.ok) return result;
    return { ok: true as const };
  });

export { confirmOrderPaid };
