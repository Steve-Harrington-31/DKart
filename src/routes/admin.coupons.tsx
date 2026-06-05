import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import toast from "react-hot-toast";
import { Plus, Trash2, Tag, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminUpsertCoupon,
  adminDeleteCoupon,
  adminToggleCouponActive,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

type Coupon = {
  id: string;
  code: string;
  type: "flat" | "percent";
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

const empty = {
  code: "",
  type: "percent" as "percent" | "flat",
  value: 10,
  min_order_amount: 0,
  max_discount_amount: "" as string | number,
  usage_limit: "" as string | number,
  expires_at: "",
  is_active: true,
};

function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const upsertFn = useServerFn(adminUpsertCoupon);
  const deleteFn = useServerFn(adminDeleteCoupon);
  const toggleFn = useServerFn(adminToggleCouponActive);

  const load = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.code.trim()) return toast.error("Code required");
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount === "" ? null : Number(form.max_discount_amount),
      usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("coupons").update(payload).eq("id", editing)
      : await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Created");
    setForm(empty); setEditing(null); setOpen(false); load();
  };

  const edit = (c: Coupon) => {
    setEditing(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      min_order_amount: c.min_order_amount,
      max_discount_amount: c.max_discount_amount ?? "",
      usage_limit: c.usage_limit ?? "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    load();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Coupons ({coupons.length})</h1>
        <button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }}
          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Coupon
        </button>
      </div>

      {open && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3">{editing ? "Edit" : "New"} Coupon</h3>
          <div className="grid md:grid-cols-3 gap-2">
            <input placeholder="CODE" className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (₹)</option>
            </select>
            <input type="number" placeholder="Value" className={input} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            <input type="number" placeholder="Min order amount" className={input} value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
            <input type="number" placeholder="Max discount (optional)" className={input} value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} />
            <input type="number" placeholder="Usage limit (optional)" className={input} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
            <input type="datetime-local" className={input} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{editing ? "Update" : "Create"}</button>
            <button onClick={() => { setOpen(false); setEditing(null); setForm(empty); }} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Min Order</th>
              <th className="px-4 py-3 font-medium">Used / Limit</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 font-mono text-xs font-bold">{c.code}</span></td>
                <td className="px-4 py-3">{c.type === "percent" ? `${c.value}%` : `₹${c.value}`}{c.max_discount_amount ? <span className="text-xs text-muted-foreground"> (max ₹{c.max_discount_amount})</span> : null}</td>
                <td className="px-4 py-3">₹{c.min_order_amount}</td>
                <td className="px-4 py-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(c)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.is_active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => edit(c)} className="text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">
                <Tag className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                No coupons yet. Create your first one.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
