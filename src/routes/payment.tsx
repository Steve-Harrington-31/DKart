import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CreditCard, Smartphone, Wallet, Banknote, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/store/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/payment")({
  validateSearch: (s: Record<string, unknown>) => ({ addr: (s.addr as string) || "" }),
  head: () => ({ meta: [{ title: "Payment — DKart" }] }),
  component: PaymentPage,
});

const methods = [
  { id: "upi", label: "UPI", icon: Smartphone, desc: "Google Pay, PhonePe, Paytm" },
  { id: "card", label: "Credit/Debit Card", icon: CreditCard, desc: "Visa, Mastercard, RuPay" },
  { id: "wallet", label: "Wallets", icon: Wallet, desc: "Paytm, Amazon Pay" },
  { id: "cod", label: "Cash on Delivery", icon: Banknote, desc: "Pay when you receive" },
];

function PaymentPage() {
  const { user, loading } = useAuth();
  const { addr } = Route.useSearch();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const clearCart = useCart((s) => s.clear);
  const [method, setMethod] = useState("upi");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (!user) return null;
  if (items.length === 0) { navigate({ to: "/home" }); return null; }
  if (!addr) { navigate({ to: "/checkout" }); return null; }

  const placeOrder = async () => {
    setPaying(true);
    try {
      const { data: address } = await supabase.from("addresses").select("*").eq("id", addr).single();
      if (!address) throw new Error("Address not found");

      // Razorpay test stub — real integration swaps in once keys are provided
      await new Promise((r) => setTimeout(r, 1200));
      const paymentId = `test_${Date.now()}`;
      const paymentStatus = method === "cod" ? "pending" : "test";

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_amount: total,
          shipping_address: address,
          payment_id: paymentId,
          payment_status: paymentStatus,
          status: "confirmed",
        })
        .select()
        .single();
      if (error || !order) throw error || new Error("Order failed");

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.product.name,
        product_image: i.product.images[0] ?? null,
        price: i.product.price,
        quantity: i.quantity,
      }));
      await supabase.from("order_items").insert(orderItems);

      await clearCart(user.id);
      navigate({ to: "/order-confirmation", search: { id: order.id } });
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
            <ShieldCheck className="h-4 w-4 text-success" /> 100% secure payments. This project runs in test mode until Razorpay keys are added.
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4 h-fit space-y-3">
          <h3 className="font-bold text-foreground">Order Total</h3>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Items ({items.length})</span><span>{formatINR(total)}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Delivery</span><span className="text-success font-semibold">FREE</span></div>
          <div className="border-t border-dashed border-border my-2" />
          <div className="flex justify-between font-bold text-foreground"><span>To Pay</span><span>{formatINR(total)}</span></div>
          <button disabled={paying} onClick={placeOrder} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {paying ? "Processing…" : method === "cod" ? `Place Order • ${formatINR(total)}` : `Pay ${formatINR(total)}`}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}
