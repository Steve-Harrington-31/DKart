import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, IndianRupee, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0, pending: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: products }, { count: orders }, { count: users }, { data: rev }, { count: pending }, { data: r }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount").neq("status", "cancelled"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (rev ?? []).reduce((s: number, o: any) => s + Number(o.total_amount), 0);
      setStats({ products: products ?? 0, orders: orders ?? 0, users: users ?? 0, revenue, pending: pending ?? 0 });
      setRecent(r ?? []);
    })();
  }, []);

  const cards = [
    { label: "Total Revenue", value: formatINR(stats.revenue), icon: IndianRupee, color: "bg-success/10 text-success" },
    { label: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "bg-primary/10 text-primary" },
    { label: "Products", value: stats.products, icon: Package, color: "bg-accent/10 text-accent" },
    { label: "Customers", value: stats.users, icon: Users, color: "bg-warning/20 text-warning-foreground" },
    { label: "Pending Orders", value: stats.pending, icon: TrendingUp, color: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-full ${c.color}`}><c.icon className="h-5 w-5" /></div>
            <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-foreground mb-3">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="text-left border-b border-border">
                <th className="py-2 font-medium">Order ID</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{o.status}</span></td>
                  <td className="py-3 text-right font-semibold">{formatINR(Number(o.total_amount))}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
