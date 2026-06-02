import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

const COLORS = ["oklch(0.42 0.13 145)", "oklch(0.68 0.17 145)", "oklch(0.78 0.16 70)", "oklch(0.55 0.18 25)", "oklch(0.5 0.15 260)"];

function AdminReports() {
  const [daily, setDaily] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // Last 14 days revenue
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data: orders } = await supabase.from("orders").select("created_at, total_amount, status").gte("created_at", since);
      const map: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        map[key] = 0;
      }
      (orders ?? []).forEach((o: any) => {
        if (o.status === "cancelled") return;
        const key = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        if (key in map) map[key] += Number(o.total_amount);
      });
      setDaily(Object.entries(map).map(([date, revenue]) => ({ date, revenue })));

      // Status breakdown
      const statusMap: Record<string, number> = {};
      (orders ?? []).forEach((o: any) => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
      setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Top products
      const { data: items } = await supabase.from("order_items").select("product_name, quantity, price");
      const prodMap: Record<string, { qty: number; revenue: number }> = {};
      (items ?? []).forEach((i: any) => {
        if (!prodMap[i.product_name]) prodMap[i.product_name] = { qty: 0, revenue: 0 };
        prodMap[i.product_name].qty += i.quantity;
        prodMap[i.product_name].revenue += Number(i.price) * i.quantity;
      });
      const top = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5)
        .map(([name, v]) => ({ name: name.slice(0, 20), revenue: v.revenue, qty: v.qty }));
      setTopProducts(top);

      // By category
      const { data: prods } = await supabase.from("products").select("category_id, categories(name), monthly_sales, price");
      const catMap: Record<string, number> = {};
      (prods ?? []).forEach((p: any) => {
        const name = p.categories?.name || "Other";
        catMap[name] = (catMap[name] || 0) + (p.monthly_sales || 0);
      });
      setByCategory(Object.entries(catMap).map(([name, value]) => ({ name, value })));
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Reports & Analytics</h1>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-foreground mb-3">Revenue — Last 14 days</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={daily}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip formatter={(v: any) => formatINR(Number(v))} />
            <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold text-foreground mb-3">Top Products</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProducts} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: any) => formatINR(Number(v))} />
              <Bar dataKey="revenue" fill={COLORS[1]} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold text-foreground mb-3">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={80} label>
                {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-foreground mb-3">Monthly Sales by Category</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byCategory}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
