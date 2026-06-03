import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — DKart" }] }),
  component: CategoriesPage,
});

type Cat = { id: string; name: string; slug: string; image_url: string | null };

function CategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      setCats(data ?? []);
      if (data?.[0]) setActive(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    supabase
      .from("products")
      .select("id,name,price,original_price,images,rating,review_count,express_shipping,quantity")
      .eq("category_id", active)
      .then(({ data }) => setProducts((data ?? []) as any));
  }, [active]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-foreground mb-4">All Categories</h1>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition ${
              active === c.id ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
              {c.image_url && <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />}
            </div>
            <span className="text-xs font-medium text-foreground text-center">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
        {products.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-12">No products in this category yet.</p>
        )}
      </div>
    </AppShell>
  );
}
