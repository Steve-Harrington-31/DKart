import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Plus, Trash2, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Address Book — DKart" }] }),
  component: AddressesPage,
});

function AddressesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    setList((data ?? []) as any);
  };
  useEffect(() => { reload(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    toast.success("Address removed");
    reload();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    reload();
  };

  if (!user) return null;

  return (
    <AppShell hideSearch>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Address Book</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add Address
        </button>
      </div>

      {showForm && <AddressForm onSaved={() => { setShowForm(false); reload(); }} />}

      {list.length === 0 && !showForm ? (
        <div className="py-20 text-center">
          <MapPin className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-foreground">No saved addresses</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="text-sm">
                  <p className="font-semibold text-foreground">{a.full_name} <span className="ml-2 text-muted-foreground font-normal">{a.phone}</span></p>
                  <p className="text-muted-foreground">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}, {a.state} - {a.pincode}</p>
                  {a.is_default && <span className="mt-2 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">DEFAULT</span>}
                </div>
                <button onClick={() => remove(a.id)} className="text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
              </div>
              {!a.is_default && (
                <button onClick={() => setDefault(a.id)} className="mt-2 text-xs font-semibold text-primary">Set as default</button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
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
    <form onSubmit={save} className="grid gap-2 rounded-2xl border border-border bg-card p-4">
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
