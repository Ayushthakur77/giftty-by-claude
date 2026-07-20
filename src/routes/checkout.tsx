import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";
import { useCartStore } from "@/lib/cart-store";
import { placeCodOrderFn, previewOrderTotalsFn } from "@/lib/checkout.functions";
import { initiateRazorpayCheckoutFn, verifyRazorpayPaymentFn } from "@/lib/payments.functions";
import { loadRazorpayScript } from "@/lib/razorpay";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("razorpay");
  const [useWallet, setUseWallet] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    full_name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "",
  });

  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("balance_paise").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Debounce the coupon code so we don't fire a preview request on every keystroke.
  const [debouncedCoupon, setDebouncedCoupon] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCoupon(couponCode), 500);
    return () => clearTimeout(t);
  }, [couponCode]);

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ["order-preview", user?.id, selectedAddressId, lines, debouncedCoupon, useWallet],
    queryFn: () =>
      previewOrderTotalsFn({
        data: { userId: user!.id, addressId: selectedAddressId!, lines, couponCode: debouncedCoupon || undefined, useWallet },
      }),
    enabled: !!user && !!selectedAddressId && lines.length > 0,
  });

  async function handleSaveAddress() {
    if (!user) return;
    const { data, error: insertErr } = await supabase
      .from("addresses")
      .insert({ ...newAddress, user_id: user.id, is_default: (addresses?.length ?? 0) === 0 })
      .select()
      .single();
    if (insertErr) { setError(insertErr.message); return; }
    await queryClient.invalidateQueries({ queryKey: ["addresses", user.id] });
    setSelectedAddressId(data.id);
    setShowNewAddress(false);
  }

  async function handlePlaceOrder() {
    if (!user || !selectedAddressId) return;

    if (paymentMethod === "cod") {
      setPlacing(true);
      setError(null);
      const result = await placeCodOrderFn({
        data: { userId: user.id, addressId: selectedAddressId, lines, couponCode: couponCode || undefined, useWallet },
      });
      setPlacing(false);
      if (!result.ok) { setError(result.error); return; }
      clearCart();
      navigate({ to: "/account" });
      return;
    }

    // Razorpay flow
    setPlacing(true);
    setError(null);

    const initResult = await initiateRazorpayCheckoutFn({
      data: { userId: user.id, addressId: selectedAddressId, lines, couponCode: couponCode || undefined, useWallet },
    });

    if (!initResult.ok) {
      setPlacing(false);
      setError(initResult.error);
      return;
    }

    try {
      await loadRazorpayScript();
    } catch {
      setPlacing(false);
      setError("Could not load the payment window — please check your connection and try again.");
      return;
    }

    const razorpay = new (window as any).Razorpay({
      key: initResult.keyId,
      amount: initResult.amountPaise,
      currency: "INR",
      name: "Giftty",
      description: `Order #${initResult.orderNumber}`,
      order_id: initResult.razorpayOrderId,
      handler: async (response: any) => {
        const verifyResult = await verifyRazorpayPaymentFn({
          data: {
            orderId: initResult.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          },
        });
        setPlacing(false);
        if (!verifyResult.ok) {
          setError(verifyResult.error);
          return;
        }
        clearCart();
        navigate({ to: "/account" });
      },
      modal: {
        ondismiss: () => setPlacing(false),
      },
      prefill: { email: user.email ?? "" },
      theme: { color: "#7A1F2B" },
    });

    razorpay.open();
  }

  if (sessionLoading) return null;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Sign in to checkout.</p>
        <Link to="/auth/sign-in" className="text-maroon hover:underline">Sign in</Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-maroon hover:underline">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div className="mb-8">
        <h2 className="font-medium text-gray-900 mb-3">Delivery Address</h2>
        <div className="space-y-2">
          {addresses?.map((a) => (
            <label key={a.id} className={`block border rounded-xl p-3 cursor-pointer text-sm ${selectedAddressId === a.id ? "border-maroon bg-cream/40" : "border-gray-200"}`}>
              <input type="radio" name="address" checked={selectedAddressId === a.id} onChange={() => setSelectedAddressId(a.id)} className="mr-2" />
              <span className="font-medium">{a.full_name}</span>, {a.line1}, {a.city}, {a.state} — {a.postal_code} · {a.phone}
            </label>
          ))}
        </div>

        {!showNewAddress ? (
          <button onClick={() => setShowNewAddress(true)} className="text-sm text-maroon hover:underline mt-3">
            + Add a new address
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 border border-gray-100 rounded-xl p-4">
            <input placeholder="Full name" value={newAddress.full_name} onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="Phone" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="Address line 1" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="Address line 2 (optional)" value={newAddress.line2} onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Postal code" value={newAddress.postal_code} onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <div className="col-span-2 flex gap-2">
              <button onClick={handleSaveAddress} className="bg-maroon text-white px-4 py-2 rounded-lg text-sm">Save address</button>
              <button onClick={() => setShowNewAddress(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="font-medium text-gray-900 mb-3">Coupon</h2>
        <input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs"
        />
      </div>

      {wallet && wallet.balance_paise > 0 && (
        <div className="mb-8">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
            Use wallet balance (₹{(wallet.balance_paise / 100).toLocaleString("en-IN")} available)
          </label>
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-medium text-gray-900 mb-3">Payment Method</h2>
        <div className="space-y-2">
          <label className={`flex items-center gap-2 border rounded-xl p-3 text-sm cursor-pointer ${paymentMethod === "razorpay" ? "border-maroon bg-cream/40" : "border-gray-200"}`}>
            <input type="radio" name="payment" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} />
            Pay Online — UPI, Card, Net Banking (Razorpay)
          </label>
          <label className={`flex items-center gap-2 border rounded-xl p-3 text-sm cursor-pointer ${paymentMethod === "cod" ? "border-maroon bg-cream/40" : "border-gray-200"}`}>
            <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
            Cash on Delivery
          </label>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-medium text-gray-900 mb-3">Order Summary</h2>
        {!selectedAddressId && <p className="text-sm text-gray-400">Select an address to see your total.</p>}
        {selectedAddressId && previewLoading && !preview && <p className="text-sm text-gray-400">Calculating…</p>}
        {selectedAddressId && preview && !preview.ok && <p className="text-sm text-red-600">{preview.error}</p>}
        {selectedAddressId && preview && preview.ok && (
          <div className="border border-gray-100 rounded-xl p-4 text-sm space-y-2">
            <div className="space-y-1 pb-2 border-b border-gray-100">
              {preview.lines.map((l, i) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>{l.description} {l.quantity > 1 ? `× ${l.quantity}` : ""}</span>
                  <span>{formatINR(l.linePaise)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatINR(preview.subtotalPaise)}</span>
            </div>
            {preview.discountPaise > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon discount</span><span>-{formatINR(preview.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span><span>{preview.shippingPaise === 0 ? "Free" : formatINR(preview.shippingPaise)}</span>
            </div>
            {preview.taxPaise > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>GST ({preview.taxPercent}%)</span><span>{formatINR(preview.taxPaise)}</span>
              </div>
            )}
            {preview.walletUsedPaise > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Wallet applied</span><span>-{formatINR(preview.walletUsedPaise)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-maroon text-base pt-2 border-t border-gray-100">
              <span>Total to pay</span><span>{formatINR(preview.totalPaise)}</span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <button
        disabled={!selectedAddressId || placing || !preview?.ok}
        onClick={handlePlaceOrder}
        className="w-full bg-maroon text-white rounded-lg py-3 font-medium hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {placing ? "Processing…" : paymentMethod === "cod" ? "Place Order (COD)" : "Pay Now"}
      </button>
    </div>
  );
}
