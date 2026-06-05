import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { sendOrderStatusEmail } from "@/lib/email";
import { adminUpdateOrderStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = typeof statuses[number];

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const updateStatusFn = useServerFn(adminUpdateOrderStatus);

  const load = async () => {
    let q = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setOrders(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: Status) => {
    const r = await updateStatusFn({ data: { order_id: id, status } });
    if (r.error) return toast.error(r.error);
    toast.success("Updated");
    const o = orders.find((x) => x.id === id);
    if (o) {
      const { data: profile } = await supabase.from("profiles").select("email,full_name").eq("id", o.user_id).maybeSingle();
      if (profile?.email) {
        sendOrderStatusEmail({
          to_email: profile.email,
          to_name: profile.full_name || o.shipping_address?.full_name || "Customer",
          order_id: o.id.slice(0, 8).toUpperCase(),
          status,
        });
      }
    }
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Orders ({orders.length})</h1>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(["all", ...statuses] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1 min-w-[180px]">
                <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-semibold text-foreground">{o.shipping_address?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold">{formatINR(Number(o.total_amount))}</p>
              </div>
              <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as Status)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
              <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="text-sm font-semibold text-primary">
                {expanded === o.id ? "Hide" : "View"}
              </button>
            </div>
            {expanded === o.id && (
              <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">SHIPPING ADDRESS</p>
                  <p className="text-sm">{o.shipping_address?.address_line1}, {o.shipping_address?.city}, {o.shipping_address?.state} - {o.shipping_address?.pincode}</p>
                  <p className="text-xs text-muted-foreground">Phone: {o.shipping_address?.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">ITEMS</p>
                  {o.order_items?.map((i: any) => (
                    <div key={i.id} className="flex justify-between text-sm py-1">
                      <span>{i.product_name} × {i.quantity}</span>
                      <span className="font-semibold">{formatINR(Number(i.price) * i.quantity)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Payment: {o.payment_status} ({o.payment_id || "—"})</p>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="py-10 text-center text-muted-foreground">No orders</p>}
      </div>
    </div>
  );
}
