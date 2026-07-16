/**
 * Checkout server functions. Runs ONLY on the server (createServerFn handler
 * bodies never ship to the browser) — this is where the v1 post-mortem
 * lessons matter most:
 *   - Price is ALWAYS recomputed here from a fresh CatalogSnapshot, never
 *     trusted from the client.
 *   - Coupon redemption goes through the atomic redeem_coupon() RPC only.
 *   - Address ownership is explicitly checked in application code, not left
 *     to RLS alone.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/server/supabase-admin.server";
import { loadCatalogSnapshot, loadDeliveryCharges } from "@/server/catalog-repo.server";
import { priceCart, computeShipping, computeTax } from "@/lib/pricing";
import type { CartLine } from "@/lib/pricing";
import { maybeRewardReferral } from "@/lib/referral.functions";

export const cartLineSchema = z.union([
  z.object({
    type: z.literal("product"),
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
    personalization: z
      .object({ name: z.string().optional(), message: z.string().optional(), font: z.string().optional(), color: z.string().optional() })
      .optional(),
  }),
  z.object({
    type: z.literal("ready_box"),
    readyBoxId: z.string().uuid(),
    quantity: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("custom_box"),
    emptyBoxId: z.string().uuid(),
    productIds: z.array(z.string().uuid()),
    ribbonId: z.string().uuid().optional(),
    fillerId: z.string().uuid().optional(),
    greetingCardId: z.string().uuid().optional(),
    giftNote: z.string().max(500).optional(),
  }),
]);

const placeCodOrderInput = z.object({
  userId: z.string().uuid(),
  addressId: z.string().uuid(),
  lines: z.array(cartLineSchema).min(1).max(50),
  couponCode: z.string().min(2).max(30).optional(),
  useWallet: z.boolean().optional(),
});

export function generateOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GFT${Date.now().toString().slice(-6)}${rand}`;
}

export const placeCodOrderFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => placeCodOrderInput.parse(d))
  .handler(async ({ data }) => {
    // 1. Verify address ownership explicitly — never rely on RLS alone,
    //    since this handler uses the admin client (which bypasses RLS).
    const { data: addr, error: addrErr } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq("id", data.addressId)
      .eq("user_id", data.userId)
      .maybeSingle();

    if (addrErr) return { ok: false as const, error: addrErr.message };
    if (!addr) return { ok: false as const, error: "Address not found" };

    // 2. Price everything server-side from a FRESH catalog snapshot.
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

    // 3. Validate + atomically redeem the coupon (if any) via the DB function.
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
          : Math.min(
              Math.round((priced.subtotalPaise * coupon.discount_value) / 100),
              coupon.max_discount_paise ?? Number.MAX_SAFE_INTEGER
            );
      couponId = coupon.id;
    }

    const taxPaise = computeTax(priced.subtotalPaise - discountPaise, 18);
    let totalPaise = priced.subtotalPaise - discountPaise + shippingResult.shippingPaise + taxPaise;

    // 3b. Wallet — apply up to the available balance against the total.
    let walletUsedPaise = 0;
    if (data.useWallet) {
      const { data: wallet } = await supabaseAdmin.from("wallets").select("balance_paise").eq("user_id", data.userId).maybeSingle();
      const available = wallet?.balance_paise ?? 0;
      walletUsedPaise = Math.min(available, totalPaise);
      totalPaise -= walletUsedPaise;
    }

    // 4. Create the order.
    const orderNumber = generateOrderNumber();
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.userId,
        address_id: data.addressId,
        order_number: orderNumber,
        status: "confirmed",
        payment_method: "cod",
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

    if (orderErr || !order) return { ok: false as const, error: orderErr?.message ?? "Failed to create order" };

    // 4b. Debit the wallet atomically — roll back the order if the balance changed underneath us.
    if (walletUsedPaise > 0) {
      const { data: debited } = await supabaseAdmin.rpc("apply_wallet_transaction", {
        _user_id: data.userId,
        _amount_paise: -walletUsedPaise,
        _reason: "order_payment",
        _order_id: order.id,
      });
      if (!debited) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        return { ok: false as const, error: "Wallet balance changed — please try again" };
      }
    }

    // 5. Redeem the coupon atomically — roll back the order if it fails
    //    (e.g. limit was hit by a concurrent request between validate and here).
    if (couponId) {
      const { data: redeemed, error: redeemErr } = await supabaseAdmin.rpc("redeem_coupon", {
        _coupon_id: couponId,
        _user_id: data.userId,
        _order_id: order.id,
        _discount_paise: discountPaise,
      });
      if (redeemErr || !redeemed) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        return { ok: false as const, error: "Coupon usage limit reached — please try again" };
      }
    }

    // 6. Write order items.
    const orderItems = priced.lines.map((line) => {
      if (line.raw.type === "product") {
        return {
          order_id: order.id,
          item_type: "product",
          product_id: line.raw.productId,
          name_snapshot: line.descriptionSnapshot,
          unit_price_paise: line.unitPricePaise,
          quantity: line.quantity,
          line_total_paise: line.linePaise,
          personalization: line.raw.personalization ?? {},
        };
      }
      if (line.raw.type === "ready_box") {
        return {
          order_id: order.id,
          item_type: "ready_box",
          ready_box_id: line.raw.readyBoxId,
          name_snapshot: line.descriptionSnapshot,
          unit_price_paise: line.unitPricePaise,
          quantity: line.quantity,
          line_total_paise: line.linePaise,
          personalization: {},
        };
      }
      return {
        order_id: order.id,
        item_type: "custom_box",
        empty_box_id: line.raw.emptyBoxId,
        name_snapshot: line.descriptionSnapshot,
        unit_price_paise: line.unitPricePaise,
        quantity: 1,
        line_total_paise: line.linePaise,
        personalization: {},
        custom_box_contents: {
          productIds: line.raw.productIds,
          ribbonId: line.raw.ribbonId,
          fillerId: line.raw.fillerId,
          greetingCardId: line.raw.greetingCardId,
          giftNote: line.raw.giftNote,
        },
      };
    });

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(orderItems);
    if (itemsErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return { ok: false as const, error: "Failed to save order items — please try again" };
    }

    // 7. Status history + invoice + notification.
    await supabaseAdmin.from("order_status_history").insert({ order_id: order.id, status: "confirmed", note: "Order placed (COD)" });

    const invoiceNumber = `INV-${orderNumber}`;
    await supabaseAdmin.from("invoices").insert({ order_id: order.id, invoice_number: invoiceNumber, gst_percent: 18 });

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: "order_update",
      title: "Order placed!",
      body: `Your order #${orderNumber} has been confirmed.`,
      link: `/account`,
    });

    // Reward a pending referral, if this was the customer's first order.
    await maybeRewardReferral(data.userId);

    return { ok: true as const, orderId: order.id, orderNumber };
  });
