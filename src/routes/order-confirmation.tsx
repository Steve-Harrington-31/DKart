import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Package, Truck, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || "" }),
  head: () => ({ meta: [{ title: "Order Confirmed — DKart" }] }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { id } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
      const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
      setOrder(o); setItems(it ?? []);
    })();
  }, [id, user]);

  if (!order) return <AppShell hideSearch><div className="py-20 text-center text-muted-foreground">Loading order…</div></AppShell>;

  const addr = order.shipping_address;

  return (
    <AppShell hideSearch>
      <div className="mx-auto max-w-2xl text-center py-6">
        <CheckCircle2 className="mx-auto h-20 w-20 text-success" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Order Confirmed!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Thank you for shopping with DKart</p>
        <p className="mt-2 text-xs text-muted-foreground">Order ID: <span className="font-mono font-semibold text-foreground">{order.id.slice(0, 8).toUpperCase()}</span></p>
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Items ({items.length})</h2>
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.id} className="flex gap-3">
                {i.product_image && <img src={i.product_image} alt={i.product_name} className="h-14 w-14 rounded-lg object-cover" />}
                <div className="flex-1 text-sm">
                  <p className="font-medium text-foreground line-clamp-1">{i.product_name}</p>
                  <p className="text-muted-foreground">Qty: {i.quantity}</p>
                </div>
                <p className="font-semibold text-foreground">{formatINR(Number(i.price) * i.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-dashed border-border pt-3 flex justify-between font-bold">
            <span>Total Paid</span><span>{formatINR(Number(order.total_amount))}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold text-foreground mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Delivering to</h2>
          <p className="text-sm font-semibold text-foreground">{addr.full_name} • {addr.phone}</p>
          <p className="text-sm text-muted-foreground">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}, {addr.city}, {addr.state} - {addr.pincode}</p>
        </div>

        <div className="rounded-2xl border border-border bg-accent/10 p-4 flex items-center gap-3">
          <Truck className="h-6 w-6 text-accent" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Expected delivery in 3-5 days</p>
            <p className="text-muted-foreground">We'll send updates to your registered email</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/orders" className="flex-1 rounded-xl bg-primary py-3 text-center font-semibold text-primary-foreground">View Orders</Link>
          <Link to="/home" className="flex-1 rounded-xl border border-border py-3 text-center font-semibold text-foreground">Continue Shopping</Link>
        </div>
      </div>
    </AppShell>
  );
}
