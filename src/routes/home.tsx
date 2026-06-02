import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home — DKart" }] }),
  component: HomePage,
});

type Category = { id: string; name: string; slug: string; image_url: string | null };

function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("products").select("id,name,price,original_price,images,rating,review_count,express_shipping").order("monthly_sales", { ascending: false }).limit(12),
      ]);
      setCats(c ?? []);
      setProducts((p ?? []) as any);
    })();
  }, []);

  if (!user) return null;

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-6 md:p-10 text-primary-foreground">
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase">Mega Sale</span>
        <h2 className="mt-3 text-2xl md:text-4xl font-bold">Tech Deals Up to 50% OFF</h2>
        <p className="mt-1 opacity-90">Free express delivery on orders above ₹499</p>
        <div className="mt-4 flex gap-1">
          <span className="h-1.5 w-6 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-bold text-foreground mb-3">Shop by category</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {cats.map((c) => (
            <Link key={c.id} to="/categories" className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-muted border border-border">
                {c.image_url && <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />}
              </div>
              <span className="text-xs font-medium text-foreground text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-card border border-border p-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/20">
          <Truck className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Lightning-fast delivery</p>
          <p className="text-xs text-muted-foreground">Tomorrow delivery available in your area</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-base font-bold text-foreground">Recommended for You</h3>
          <Link to="/categories" className="text-xs font-semibold text-primary">See all</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </AppShell>
  );
}
