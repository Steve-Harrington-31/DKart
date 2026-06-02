import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/store/wishlist-store";
import { useCart } from "@/store/cart-store";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — DKart" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const items = useWishlist((s) => s.items);
  const load = useWishlist((s) => s.load);
  const remove = useWishlist((s) => s.remove);
  const addCart = useCart((s) => s.add);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (user) load(user.id);
  }, [user, loading, navigate, load]);

  if (!user) return null;

  if (items.length === 0) {
    return (
      <AppShell>
        <div className="grid place-items-center py-20 text-center">
          <Heart className="h-20 w-20 text-muted-foreground/40" />
          <h2 className="mt-4 text-xl font-bold text-foreground">Your wishlist is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save items you love for later</p>
          <Link to="/home" className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Browse Products
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-foreground mb-4">My Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((i) => (
          <div key={i.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <Link to="/products/$id" params={{ id: i.product.id }} className="block aspect-square bg-muted">
              <img src={i.product.images[0]} alt={i.product.name} className="h-full w-full object-cover" />
            </Link>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground line-clamp-2">{i.product.name}</p>
              <p className="mt-1 font-bold text-foreground">{formatINR(i.product.price)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={async () => { await addCart(user.id, i.product.id); await remove(i.id); toast.success("Moved to cart"); }}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
                >
                  Move to Cart
                </button>
                <button onClick={() => remove(i.id)} className="rounded-lg border border-border px-2">
                  <Heart className="h-4 w-4 fill-destructive text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
