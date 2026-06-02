import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — DKart" }] }),
  component: OrdersPage,
});

const statusColor: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  processing: "bg-accent/20 text-accent",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
    })();
  }, [user]);

  if (!user) return null;

  return (
    <AppShell hideSearch>
      <h1 className="text-2xl font-bold text-foreground mb-4">My Orders</h1>
      {orders.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-foreground">No orders yet</p>
          <Link to="/home" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColor[o.status] || "bg-muted text-foreground"}`}>{o.status}</span>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {o.order_items?.slice(0, 4).map((i: any) => (
                  i.product_image && <img key={i.id} src={i.product_image} alt={i.product_name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                <p className="text-sm text-muted-foreground">{o.order_items?.length || 0} item(s)</p>
                <p className="font-bold text-foreground">{formatINR(Number(o.total_amount))}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
