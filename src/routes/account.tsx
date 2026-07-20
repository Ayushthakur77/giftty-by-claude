import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";
import { useIsSuperAdmin } from "@/lib/use-role";
import { Modal } from "@/components/Modal";
import { cancelOrderFn } from "@/lib/orders.functions";

export const Route = createFileRoute("/account")({ component: AccountPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AccountPage() {
  const { user, loading: sessionLoading } = useSession();
  const { isSuperAdmin } = useIsSuperAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [birthday, setBirthday] = useState("");
  const [birthdayOptIn, setBirthdayOptIn] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: detailOrder } = useQuery({
    queryKey: ["my-order-detail", detailOrderId],
    queryFn: async () => {
      const [order, itemsRes, invoiceRes, historyRes] = await Promise.all([
        supabase.from("orders").select("*, addresses(*)").eq("id", detailOrderId!).single(),
        supabase.from("order_items").select("*").eq("order_id", detailOrderId!),
        supabase.from("invoices").select("*").eq("order_id", detailOrderId!).maybeSingle(),
        supabase.from("order_status_history").select("*").eq("order_id", detailOrderId!).order("created_at"),
      ]);

      const items = itemsRes.data ?? [];
      const productIds = items.filter((i) => i.item_type === "product" && i.product_id).map((i) => i.product_id!);
      const readyBoxIds = items.filter((i) => i.item_type === "ready_box" && i.ready_box_id).map((i) => i.ready_box_id!);

      const [productsRes, readyBoxesRes] = await Promise.all([
        productIds.length ? supabase.from("products").select("id, images").in("id", productIds) : Promise.resolve({ data: [] }),
        readyBoxIds.length ? supabase.from("ready_gift_boxes").select("id, images").in("id", readyBoxIds) : Promise.resolve({ data: [] }),
      ]);

      const imageMap = new Map<string, string | null>();
      for (const p of productsRes.data ?? []) imageMap.set(p.id, Array.isArray(p.images) && p.images[0] ? (p.images[0] as string) : null);
      for (const b of readyBoxesRes.data ?? []) imageMap.set(b.id, Array.isArray(b.images) && b.images[0] ? (b.images[0] as string) : null);

      const itemsWithImages = items.map((it) => ({ ...it, image: imageMap.get(it.product_id ?? it.ready_box_id ?? "") ?? null }));

      return { order: order.data, items: itemsWithImages, invoice: invoiceRes.data, history: historyRes.data ?? [] };
    },
    enabled: !!detailOrderId,
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

  async function handleCancelOrder() {
    if (!user || !detailOrderId) return;
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    setCancelMessage(null);
    const result = await cancelOrderFn({ data: { orderId: detailOrderId, userId: user.id } });
    setCancelling(false);
    if (result.ok) {
      setCancelMessage(result.message);
      queryClient.invalidateQueries({ queryKey: ["my-order-detail", detailOrderId] });
      queryClient.invalidateQueries({ queryKey: ["my-orders", user.id] });
      queryClient.invalidateQueries({ queryKey: ["my-wallet", user.id] });
    } else {
      setCancelMessage(result.error);
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">
            Hey, {profile?.full_name?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-maroon">
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button onClick={() => document.getElementById("orders-section")?.scrollIntoView({ behavior: "smooth" })} className="border border-gray-100 rounded-xl p-4 text-left hover:border-maroon/40 transition">
          <p className="text-sm font-medium text-gray-900">Orders</p>
          <p className="text-xs text-gray-400">{orders?.length ?? 0} placed</p>
        </button>
        <Link to="/wishlist" className="border border-gray-100 rounded-xl p-4 text-left hover:border-maroon/40 transition block">
          <p className="text-sm font-medium text-gray-900">Wishlist</p>
          <p className="text-xs text-gray-400">Saved items</p>
        </Link>
        <Link to="/account/referrals" className="border border-gray-100 rounded-xl p-4 text-left hover:border-maroon/40 transition block">
          <p className="text-sm font-medium text-gray-900">Refer a Friend</p>
          <p className="text-xs text-gray-400">Earn wallet credit</p>
        </Link>
        <Link to="/help" className="border border-gray-100 rounded-xl p-4 text-left hover:border-maroon/40 transition block">
          <p className="text-sm font-medium text-gray-900">Help Center</p>
          <p className="text-xs text-gray-400">FAQs & support</p>
        </Link>
      </div>

      {isSuperAdmin && (
        <Link
          to="/admin/dashboard"
          className="block bg-maroon text-white rounded-xl p-4 mb-6 hover:bg-maroon-dark transition"
        >
          <p className="font-medium">You have Admin access</p>
          <p className="text-sm text-white/80">Go to Admin Panel →</p>
        </Link>
      )}

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

      <div id="orders-section" className="flex gap-6 text-sm text-gray-500 border-b border-gray-100 mb-6">
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
            <button
              key={o.id}
              onClick={() => setDetailOrderId(o.id)}
              className="w-full flex items-center justify-between border border-gray-100 rounded-xl p-4 text-left hover:border-maroon/40 transition"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">#{o.order_number}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                {o.status}
              </span>
              <p className="font-medium text-maroon">{formatINR(o.total_paise)}</p>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!detailOrderId} onOpenChange={(o) => { if (!o) { setDetailOrderId(null); setCancelMessage(null); } }} title={`Order #${detailOrder?.order?.order_number ?? ""}`}>
        {detailOrder?.order && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-2">Order Status</p>
              <div className="flex items-center gap-1">
                {["pending", "confirmed", "shipped", "delivered"].map((s, i) => {
                  const statusOrder = ["pending", "confirmed", "shipped", "delivered"];
                  const currentIdx = statusOrder.indexOf(detailOrder.order.status);
                  const reached = detailOrder.order.status !== "cancelled" && currentIdx >= i;
                  return (
                    <div key={s} className="flex-1 flex items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${reached ? "bg-maroon" : "bg-gray-200"}`} />
                      {i < 3 && <div className={`flex-1 h-0.5 ${reached && currentIdx > i ? "bg-maroon" : "bg-gray-200"}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Placed</span><span>Confirmed</span><span>Shipped</span><span>Delivered</span>
              </div>
              {detailOrder.order.status === "cancelled" && (
                <p className="text-red-600 text-xs mt-2">This order was cancelled{detailOrder.order.cancel_reason ? `: ${detailOrder.order.cancel_reason}` : "."}</p>
              )}
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Items</p>
              <ul className="space-y-2">
                {detailOrder.items.map((it: any) => (
                  <li key={it.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                      {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <span className="flex-1 text-gray-700">{it.name_snapshot} × {it.quantity}</span>
                    <span className="text-gray-700">{formatINR(it.line_total_paise)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <p className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatINR(detailOrder.order.subtotal_paise)}</span></p>
              <p className="flex justify-between text-gray-600"><span>Shipping</span><span>{formatINR(detailOrder.order.shipping_paise)}</span></p>
              {detailOrder.order.tax_paise > 0 && (
                <p className="flex justify-between text-gray-600"><span>GST</span><span>{formatINR(detailOrder.order.tax_paise)}</span></p>
              )}
              {detailOrder.order.discount_paise > 0 && (
                <p className="flex justify-between text-green-600"><span>Coupon discount</span><span>-{formatINR(detailOrder.order.discount_paise)}</span></p>
              )}
              {detailOrder.order.wallet_used_paise > 0 && (
                <p className="flex justify-between text-green-600"><span>Wallet applied</span><span>-{formatINR(detailOrder.order.wallet_used_paise)}</span></p>
              )}
              <p className="flex justify-between font-semibold text-maroon text-base pt-1"><span>Total paid</span><span>{formatINR(detailOrder.order.total_paise)}</span></p>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Delivery Address</p>
              <p className="text-gray-600 text-xs">
                {detailOrder.order.addresses?.full_name}, {detailOrder.order.addresses?.line1}, {detailOrder.order.addresses?.city}, {detailOrder.order.addresses?.state} — {detailOrder.order.addresses?.postal_code}
              </p>
            </div>

            {cancelMessage && <p className="text-sm text-gray-700 bg-cream/60 border border-gold/30 rounded-lg p-3">{cancelMessage}</p>}

            <div className="flex gap-2 pt-2">
              <Link
                to="/account/orders/$orderId/invoice"
                params={{ orderId: detailOrder.order.id }}
                className="flex-1 text-center border border-gray-300 rounded-lg py-2 text-sm hover:border-maroon hover:text-maroon transition"
              >
                Download Invoice
              </Link>
              {["pending", "confirmed"].includes(detailOrder.order.status) && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 border border-red-200 text-red-600 rounded-lg py-2 text-sm hover:bg-red-50 disabled:opacity-40 transition"
                >
                  {cancelling ? "Cancelling…" : "Cancel Order"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
