import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Product = {
  id?: string;
  reference_id?: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  category_id: string | null;
  images: string[];
  quantity: number;
  express_shipping: boolean;
  status: "available" | "out_of_stock" | "discontinued";
};

const empty: Product = {
  name: "", description: "", price: 0, original_price: null,
  category_id: null, images: [], quantity: 0, express_shipping: false, status: "available",
};

function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
    setProducts(data ?? []);
  };
  useEffect(() => {
    load();
    supabase.from("categories").select("*").then(({ data }) => setCats(data ?? []));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Products ({products.length})</h1>
        <button onClick={() => setEditing({ ...empty })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products"
          className="w-full rounded-full bg-card border border-border pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.images?.[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover bg-muted" />
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.reference_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.categories?.name ?? "-"}</td>
                <td className="px-4 py-3 font-semibold">{formatINR(Number(p.price))}</td>
                <td className="px-4 py-3">{p.quantity}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === "available" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(p)} className="p-1.5 text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No products</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <ProductDialog product={editing} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ProductDialog({ product, cats, onClose, onSaved }: { product: Product; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Product>(product);
  const [imagesCsv, setImagesCsv] = useState(product.images.join("\n"));
  const [saving, setSaving] = useState(false);
  const isEdit = !!product.id;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const images = imagesCsv.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload: any = {
      name: form.name,
      description: form.description,
      price: form.price,
      original_price: form.original_price || null,
      category_id: form.category_id || null,
      images,
      quantity: form.quantity,
      express_shipping: form.express_shipping,
      status: form.status,
    };
    let res;
    if (isEdit) {
      res = await supabase.from("products").update(payload).eq("id", product.id!);
    } else {
      payload.reference_id = "DK" + Math.random().toString(36).slice(2, 10).toUpperCase();
      res = await supabase.from("products").insert(payload);
    }
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(isEdit ? "Updated" : "Created");
    onSaved();
  };

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <form onSubmit={save} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{isEdit ? "Edit" : "Add"} Product</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <Field label="Name"><input required className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><textarea rows={3} className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)"><input required type="number" min="0" className={input} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          <Field label="Original Price (₹)"><input type="number" min="0" className={input} value={form.original_price ?? ""} onChange={(e) => setForm({ ...form, original_price: e.target.value ? Number(e.target.value) : null })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className={input} value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
              <option value="">— None —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Stock Quantity"><input required type="number" min="0" className={input} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Image URLs (one per line)">
          <textarea rows={3} className={input} value={imagesCsv} onChange={(e) => setImagesCsv(e.target.value)} placeholder="https://..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="available">Available</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </Field>
          <label className="flex items-end gap-2 text-sm pb-2">
            <input type="checkbox" checked={form.express_shipping} onChange={(e) => setForm({ ...form, express_shipping: e.target.checked })} />
            Express Shipping
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold">Cancel</button>
          <button disabled={saving} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">{saving ? "Saving…" : "Save Product"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}
