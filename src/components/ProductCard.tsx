import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import toast from "react-hot-toast";
import { discountPct, formatINR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/store/cart-store";
import { useWishlist } from "@/store/wishlist-store";

export type Product = {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  images: string[];
  rating: number;
  review_count?: number;
  express_shipping?: boolean;
  quantity?: number;
};

export function ProductCard({ p }: { p: Product }) {
  const { user } = useAuth();
  const addToCart = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const inWish = useWishlist((s) => s.has(p.id));
  const pct = discountPct(p.price, p.original_price);
  const outOfStock = p.quantity !== undefined && p.quantity <= 0;

  const handleAdd = async () => {
    if (!user) return toast.error("Please login to add to cart");
    if (outOfStock) return toast.error("Out of stock");
    await addToCart(user.id, p.id);
    toast.success("Added to cart");
  };
  const handleWish = async () => {
    if (!user) return toast.error("Please login");
    await toggleWish(user.id, p.id);
  };

  return (
    <div className="group rounded-2xl bg-card border border-border overflow-hidden flex flex-col">
      <Link to="/products/$id" params={{ id: p.id }} className="relative block aspect-square bg-muted">
        <img src={p.images[0]} alt={p.name} loading="lazy" className={`h-full w-full object-cover transition group-hover:scale-105 ${outOfStock ? "opacity-50" : ""}`} />
        {pct > 0 && !outOfStock && (
          <span className="absolute top-2 left-2 rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
            {pct}% OFF
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
            OUT OF STOCK
          </span>
        )}
        {p.express_shipping && !outOfStock && (
          <span className="absolute top-2 right-9 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            EXPRESS
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); handleWish(); }}
          className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 shadow"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 ${inWish ? "fill-destructive text-destructive" : "text-foreground"}`} />
        </button>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/products/$id" params={{ id: p.id }} className="line-clamp-2 text-sm font-medium text-foreground">
          {p.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-semibold text-foreground">{p.rating.toFixed(1)}</span>
          {p.review_count !== undefined && <span>({p.review_count})</span>}
        </div>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-bold text-foreground">{formatINR(p.price)}</span>
          {p.original_price && p.original_price > p.price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(p.original_price)}</span>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {outOfStock ? "Sold Out" : "Add to Cart"}
        </button>

      </div>
    </div>
  );
}
