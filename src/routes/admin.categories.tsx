import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

type Category = { id?: string; name: string; slug: string; image_url: string };
const empty: Category = { name: "", slug: "", image_url: "" };

function AdminCategories() {
  const [list, setList] = useState<any[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Categories ({list.length})</h1>
        <button onClick={() => setEditing({ ...empty })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {list.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-full overflow-hidden bg-muted">
              {c.image_url && <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />}
            </div>
            <p className="mt-2 font-semibold text-foreground">{c.name}</p>
            <p className="text-xs text-muted-foreground">/{c.slug}</p>
            <div className="mt-2 flex justify-center gap-1">
              <button onClick={() => setEditing(c)} className="p-1.5 text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(c.id)} className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && <Dialog cat={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function Dialog({ cat, onClose, onSaved }: { cat: Category; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(cat);
  const [saving, setSaving] = useState(false);
  const isEdit = !!cat.id;
  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { name: form.name, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"), image_url: form.image_url };
    const res = isEdit
      ? await supabase.from("categories").update(payload).eq("id", cat.id!)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{isEdit ? "Edit" : "Add"} Category</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <input required placeholder="Name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Slug (auto if empty)" className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input placeholder="Image URL" className={input} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <button disabled={saving} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">{saving ? "Saving…" : "Save"}</button>
      </form>
    </div>
  );
}
