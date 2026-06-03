import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Minus, Plus, Star, Truck, Zap, ShieldCheck, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/AppShell";
import { Reviews } from "@/components/Reviews";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, discountPct } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/store/cart-store";
import { useWishlist } from "@/store/wishlist-store";

export const Route = createFileRoute("/products/$id")({
  component: ProductDetail,
});

type P = {
  id: string;
  reference_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string[];
  quantity: number;
  rating: number;
  review_count: number;
  express_shipping: boolean;
  specifications: Record<string, string>;
};

function ProductDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const addToCart = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const inWish = useWishlist((s) => s.has(id));

  const [p, setP] = useState<P | null>(null);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => setP(data as any));
    const channel = supabase
      .channel(`product-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${id}` },
        (payload) => setP((prev) => prev ? { ...prev, ...(payload.new as any) } : (payload.new as any)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (!p) return <AppShell><div className="h-96 grid place-items-center text-muted-foreground">Loading…</div></AppShell>;

  const outOfStock = p.quantity <= 0;
  const lowStock = !outOfStock && p.quantity <= 5;

  const pct = discountPct(p.price, p.original_price);

  const handleAdd = async () => {
    if (!user) return toast.error("Please login");
    await addToCart(user.id, p.id, qty);
    toast.success("Added to cart");
  };

  return (
    <AppShell hideSearch>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="aspect-square rounded-2xl bg-card border border-border overflow-hidden">
            <img src={p.images[img]} alt={p.name} className="h-full w-full object-cover" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {p.images.map((src, i) => (
                <button key={i} onClick={() => setImg(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === img ? "border-primary" : "border-border"}`}>
                  <img src={src} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground"><Link to="/categories" className="hover:underline">Categories</Link> / Product</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-md bg-success px-2 py-0.5 text-success-foreground font-semibold">
              <Star className="h-3 w-3 fill-current" /> {p.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">{p.review_count} reviews</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-3xl font-bold text-foreground">{formatINR(p.price)}</span>
            {p.original_price && p.original_price > p.price && (
              <>
                <span className="text-base text-muted-foreground line-through">{formatINR(p.original_price)}</span>
                <span className="text-sm font-bold text-success">SAVE {pct}%</span>
              </>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Quantity</span>
            <div className="flex items-center rounded-lg border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(Math.min(p.quantity, qty + 1))} className="p-2"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={async () => { if (!user) return toast.error("Login"); await toggleWish(user.id, p.id); }}
              className="ml-auto grid h-10 w-10 place-items-center rounded-lg border border-border">
              <Heart className={`h-5 w-5 ${inWish ? "fill-destructive text-destructive" : ""}`} />
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={handleAdd} className="flex-1 rounded-xl border border-primary py-3 font-semibold text-primary hover:bg-primary/5">
              Add to Cart
            </button>
            <Link to="/cart" onClick={handleAdd} className="flex-1 grid place-items-center rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90">
              Buy Now
            </Link>
          </div>

          <div className="mt-6 space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent" /> Standard delivery in 4–6 days · Free</div>
            {p.express_shipping && <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> Express delivery tomorrow · ₹49</div>}
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 7-day easy returns</div>
          </div>

          {p.description && (
            <section className="mt-6">
              <h3 className="font-bold text-foreground mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </section>
          )}

          {p.specifications && Object.keys(p.specifications).length > 0 && (
            <section className="mt-6">
              <h3 className="font-bold text-foreground mb-2">Specifications</h3>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(p.specifications).map(([k, v]) => (
                    <tr key={k} className="border-b border-border">
                      <td className="py-2 text-muted-foreground capitalize">{k}</td>
                      <td className="py-2 text-foreground font-medium">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
