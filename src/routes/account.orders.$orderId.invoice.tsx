import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/account/orders/$orderId/invoice")({ component: InvoicePage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function InvoicePage() {
  const { orderId } = Route.useParams();
  const { user } = useSession();

  const { data } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: async () => {
      const [orderRes, itemsRes, invoiceRes, settingsRes] = await Promise.all([
        supabase.from("orders").select("*, addresses(*)").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle(),
        supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      return { order: orderRes.data, items: itemsRes.data ?? [], invoice: invoiceRes.data, settings: settingsRes.data };
    },
    enabled: !!user && !!orderId,
  });

  useEffect(() => {
    if (data?.order) document.title = `Invoice ${data.invoice?.invoice_number ?? data.order.order_number}`;
  }, [data]);

  if (!data?.order) return <div className="max-w-2xl mx-auto px-4 py-12 text-gray-400">Loading…</div>;

  const { order, items, invoice, settings } = data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 print:py-0">
      <div className="flex justify-between items-start mb-8 print:hidden">
        <h1 className="font-heading text-xl font-bold text-gray-900">Invoice</h1>
        <button onClick={() => window.print()} className="bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark transition">
          Print / Save as PDF
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl p-8 print:border-0">
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
          <div>
            <p className="font-script text-2xl text-maroon">{settings?.store_name ?? "Giftty"}</p>
            {settings?.business_address && <p className="text-xs text-gray-500 mt-1 max-w-xs">{settings.business_address}</p>}
            {settings?.gst_number && <p className="text-xs text-gray-500">GSTIN: {settings.gst_number}</p>}
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-gray-900">Invoice {invoice?.invoice_number ?? `#${order.order_number}`}</p>
            <p className="text-gray-500">{new Date(order.created_at).toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Billed to</p>
            <p className="text-gray-800">{order.addresses?.full_name}</p>
            <p className="text-gray-600">{order.addresses?.line1}, {order.addresses?.city}</p>
            <p className="text-gray-600">{order.addresses?.state} — {order.addresses?.postal_code}</p>
            <p className="text-gray-600">{order.addresses?.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Order details</p>
            <p className="text-gray-600">Order #{order.order_number}</p>
            <p className="text-gray-600">Payment: {order.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}</p>
            <p className="text-gray-600">Status: {order.payment_status}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-200">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Unit Price</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-800">{it.name_snapshot}</td>
                <td className="py-2 text-right text-gray-600">{it.quantity}</td>
                <td className="py-2 text-right text-gray-600">{formatINR(it.unit_price_paise)}</td>
                <td className="py-2 text-right text-gray-800">{formatINR(it.line_total_paise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatINR(order.subtotal_paise)}</span></div>
            {order.discount_paise > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatINR(order.discount_paise)}</span></div>
            )}
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{formatINR(order.shipping_paise)}</span></div>
            <div className="flex justify-between text-gray-600"><span>GST ({invoice?.gst_percent ?? 18}%)</span><span>{formatINR(order.tax_paise)}</span></div>
            {order.wallet_used_paise > 0 && (
              <div className="flex justify-between text-green-600"><span>Wallet applied</span><span>-{formatINR(order.wallet_used_paise)}</span></div>
            )}
            <div className="flex justify-between font-semibold text-maroon text-base pt-2 border-t border-gray-200">
              <span>Total</span><span>{formatINR(order.total_paise)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10 pt-6 border-t border-gray-100">
          Thank you for shopping with {settings?.store_name ?? "Giftty"}. {settings?.support_email && `For queries, contact ${settings.support_email}`}
        </p>
      </div>
    </div>
  );
}
