import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/store/cart-store";
import { useCoupon } from "@/store/coupon-store";
import { validateCoupon } from "@/lib/coupons";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "My Cart — DKart" }] }),
  component: CartPage,
});

function CartPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);
  const load = useCart((s) => s.load);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (user) load(user.id);
  }, [user, loading, navigate, load]);

  if (!user) return null;

  const savings = items.reduce((s, i) => s + (i.product.original_price ? (i.product.original_price - i.product.price) * i.quantity : 0), 0);

  if (items.length === 0) {
    return (
      <AppShell hideSearch>
        <div className="grid place-items-center py-20 text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground/40" />
          <h2 className="mt-4 text-xl font-bold text-foreground">Your cart is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Discover amazing products on DKart</p>
          <Link to="/home" className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
            Continue Shopping
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideSearch>
      <h1 className="text-2xl font-bold text-foreground mb-4">My Cart ({items.length})</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              <img src={i.product.images[0]} alt={i.product.name} className="h-24 w-24 rounded-lg object-cover" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground line-clamp-2">{i.product.name}</h3>
                <p className="mt-1 font-bold text-foreground">{formatINR(i.product.price)}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-border">
                    <button onClick={() => updateQty(i.id, i.quantity - 1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                    <button onClick={() => updateQty(i.id, i.quantity + 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => { remove(i.id); toast.success("Removed"); }} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4 h-fit space-y-3">
          <h3 className="font-bold text-foreground">Price Details</h3>
          <CouponBox subtotal={total} />
          <Row label={`Price (${items.length} items)`} value={formatINR(total + savings)} />
          {savings > 0 && <Row label="Discount" value={`- ${formatINR(savings)}`} accent />}
          <CouponRow />
          <Row label="Delivery Charges" value="FREE" accent />
          <div className="border-t border-dashed border-border my-2" />
          <TotalRow subtotal={total} />
          {savings > 0 && <p className="text-xs font-semibold text-success">You will save {formatINR(savings)} on this order</p>}
          <button
            onClick={() => navigate({ to: "/checkout" })}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Proceed to Checkout
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function CouponBox({ subtotal }: { subtotal: number }) {
  const coupon = useCoupon((s) => s.coupon);
  const apply = useCoupon((s) => s.apply);
  const clear = useCoupon((s) => s.clear);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-success">
          <Tag className="h-4 w-4" /> {coupon.code} applied
        </span>
        <button onClick={() => { clear(); toast.success("Coupon removed"); }} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    const res = await validateCoupon(code, subtotal);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    apply({ code: res.coupon.code, discount: res.discount });
    setCode("");
    toast.success(`Saved ${formatINR(res.discount)}!`);
  };

  return (
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter coupon code"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
      />
      <button onClick={submit} disabled={busy || !code.trim()}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50">
        Apply
      </button>
    </div>
  );
}

function CouponRow() {
  const coupon = useCoupon((s) => s.coupon);
  if (!coupon) return null;
  return <Row label={`Coupon (${coupon.code})`} value={`- ${formatINR(coupon.discount)}`} accent />;
}

function TotalRow({ subtotal }: { subtotal: number }) {
  const coupon = useCoupon((s) => s.coupon);
  const final = Math.max(0, subtotal - (coupon?.discount ?? 0));
  return <Row label="Total Amount" value={formatINR(final)} bold />;
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-bold text-foreground text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={accent ? "text-success font-semibold" : ""}>{value}</span>
    </div>
  );
}
