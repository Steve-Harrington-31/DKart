import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Plus, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/store/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

type Address = {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — DKart" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const loadAddresses = async () => {
    if (!user) return;
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    setAddresses((data ?? []) as any);
    if (data && data.length && !selected) setSelected(data[0].id);
    if (!data || data.length === 0) setShowForm(true);
  };

  useEffect(() => { loadAddresses(); }, [user]);

  if (!user) return null;
  if (items.length === 0) {
    return (
      <AppShell hideSearch>
        <div className="py-20 text-center">
          <p className="font-semibold text-foreground">Your cart is empty</p>
          <Link to="/home" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Continue Shopping</Link>
        </div>
      </AppShell>
    );
  }

  const proceed = () => {
    if (!selected) return toast.error("Please select a delivery address");
    navigate({ to: "/payment", search: { addr: selected } });
  };

  return (
    <AppShell hideSearch>
      <h1 className="text-2xl font-bold text-foreground mb-4">Checkout</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Delivery Address</h2>
              <button onClick={() => setShowForm((v) => !v)} className="text-xs font-semibold text-primary flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add new
              </button>
            </div>

            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${selected === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" checked={selected === a.id} onChange={() => setSelected(a.id)} className="mt-1 accent-primary" />
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{a.full_name} <span className="ml-2 text-muted-foreground font-normal">{a.phone}</span></p>
                      <p className="text-muted-foreground">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}, {a.state} - {a.pincode}</p>
                      {a.is_default && <span className="mt-1 inline-block text-[10px] font-bold text-accent">DEFAULT</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {showForm && <AddressForm onSaved={() => { setShowForm(false); loadAddresses(); }} />}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-bold text-foreground mb-3">Order Summary ({items.length} items)</h2>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex gap-3">
                  <img src={i.product.images[0]} alt={i.product.name} className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="line-clamp-1 font-medium text-foreground">{i.product.name}</p>
                    <p className="text-muted-foreground">Qty: {i.quantity}</p>
                  </div>
                  <p className="font-semibold text-foreground">{formatINR(i.product.price * i.quantity)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4 h-fit space-y-3">
          <h3 className="font-bold text-foreground">Price Details</h3>
          <Row label={`Items (${items.length})`} value={formatINR(total)} />
          <Row label="Delivery" value="FREE" accent />
          <div className="border-t border-dashed border-border my-2" />
          <Row label="Total" value={formatINR(total)} bold />
          <button onClick={proceed} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90">
            Continue to Payment
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-bold text-foreground text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={accent ? "text-success font-semibold" : ""}>{value}</span>
    </div>
  );
}

function AddressForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", address_line1: "", address_line2: "", city: "", state: "", pincode: "", is_default: false });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("addresses").insert({ ...form, user_id: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Address added");
    onSaved();
  };

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={save} className="mt-3 grid gap-2 rounded-xl border border-dashed border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <input required placeholder="Full name" className={input} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input required placeholder="Phone" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <input required placeholder="House no, Building, Street" className={input} value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
      <input placeholder="Area, Landmark (optional)" className={input} value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <input required placeholder="City" className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input required placeholder="State" className={input} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <input required placeholder="Pincode" className={input} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Set as default
      </label>
      <button disabled={saving} className="rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-1">
        <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save Address"}
      </button>
    </form>
  );
}
