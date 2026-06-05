import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import toast from "react-hot-toast";
import { Smartphone, Banknote, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/store/cart-store";
import { useCoupon } from "@/store/coupon-store";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { createRazorpayOrder, placeOrder } from "@/lib/razorpay.functions";

export const Route = createFileRoute("/payment")({
  validateSearch: (s: Record<string, unknown>) => ({ addr: (s.addr as string) || "" }),
  head: () => ({ meta: [{ title: "Payment — DKart" }] }),
  component: PaymentPage,
});

const methods = [
  { id: "razorpay", label: "UPI / Card / Wallet", icon: Smartphone, desc: "Pay securely via Razorpay (UPI, cards, netbanking, wallets)" },
  { id: "cod", label: "Cash on Delivery", icon: Banknote, desc: "Pay when you receive" },
];

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PaymentPage() {
  const { user, loading } = useAuth();
  const { addr } = Route.useSearch();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const refreshCart = useCart((s) => s.refresh);
  const subtotal = useCart((s) => s.total());
  const coupon = useCoupon((s) => s.coupon);
  const clearCoupon = useCoupon((s) => s.clear);
  const total = Math.max(0, subtotal - (coupon?.discount ?? 0));
  const [method, setMethod] = useState("razorpay");
  const [paying, setPaying] = useState(false);

  const createOrder = useServerFn(createRazorpayOrder);
  const placeOrderFn = useServerFn(placeOrder);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (!user) return null;
  if (items.length === 0) { navigate({ to: "/home" }); return null; }
  if (!addr) { navigate({ to: "/checkout" }); return null; }

  const afterPlaced = async (orderId: string, addressFullName: string, addressLine: string) => {
    if (user?.id) await refreshCart(user.id);
    clearCoupon();
    sendOrderConfirmationEmail({
      to_email: user.email ?? "",
      to_name: addressFullName,
      order_id: orderId.slice(0, 8).toUpperCase(),
      total: formatINR(total),
      items_count: items.length,
      address: addressLine,
    });
    navigate({ to: "/order-confirmation", search: { id: orderId } });
  };

  const fetchAddressForEmail = async () => {
    const { data } = await supabase.from("addresses").select("*").eq("id", addr).maybeSingle();
    return data;
  };

  const placeOrderNow = async () => {
    setPaying(true);
    try {
      if (method === "cod") {
        const r = await placeOrderFn({ data: {
          address_id: addr,
          coupon_code: coupon?.code ?? null,
          payment_method: "cod",
        }});
        if (r.error || !r.orderId) throw new Error(r.error || "Could not place order");
        const a = await fetchAddressForEmail();
        await afterPlaced(r.orderId, a?.full_name ?? "Customer",
          a ? `${a.address_line1}, ${a.city}, ${a.state} - ${a.pincode}` : "");
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Couldn't load Razorpay. Check your connection.");

      const orderRes = await createOrder({ data: { coupon_code: coupon?.code ?? null } });
      if (orderRes.error || !orderRes.order || !orderRes.keyId) {
        throw new Error(orderRes.error || "Failed to create payment order");
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderRes.keyId,
          amount: orderRes.order.amount,
          currency: orderRes.order.currency,
          name: "DKart",
          description: `Order of ${items.length} item${items.length > 1 ? "s" : ""}`,
          order_id: orderRes.order.id,
          prefill: { email: user.email },
          theme: { color: "#1B5E20" },
          handler: async (resp: any) => {
            try {
              const r = await placeOrderFn({ data: {
                address_id: addr,
                coupon_code: coupon?.code ?? null,
                payment_method: "razorpay",
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }});
              if (r.error || !r.orderId) {
                reject(new Error(r.error || "Could not place order"));
                return;
              }
              const a = await fetchAddressForEmail();
              await afterPlaced(r.orderId, a?.full_name ?? "Customer",
                a ? `${a.address_line1}, ${a.city}, ${a.state} - ${a.pincode}` : "");
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        rzp.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "Payment failed")));
        rzp.open();
      });
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <AppShell hideSearch>
      <h1 className="text-2xl font-bold text-foreground mb-4">Payment</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-bold text-foreground mb-3">Choose Payment Method</h2>
            <div className="space-y-2">
              {methods.map((m) => (
                <label key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${method === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-primary" />
                  <m.icon className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Payments are processed securely by Razorpay.
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4 h-fit space-y-3">
          <h3 className="font-bold text-foreground">Order Total</h3>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Items ({items.length})</span><span>{formatINR(subtotal)}</span></div>
          {coupon && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Coupon ({coupon.code})</span><span className="text-success font-semibold">- {formatINR(coupon.discount)}</span></div>}
          <div className="flex justify-between text-sm text-muted-foreground"><span>Delivery</span><span className="text-success font-semibold">FREE</span></div>
          <div className="border-t border-dashed border-border my-2" />
          <div className="flex justify-between font-bold text-foreground"><span>To Pay</span><span>{formatINR(total)}</span></div>
          <button disabled={paying} onClick={placeOrderNow} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {paying ? "Processing…" : method === "cod" ? `Place Order • ${formatINR(total)}` : `Pay ${formatINR(total)}`}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}
