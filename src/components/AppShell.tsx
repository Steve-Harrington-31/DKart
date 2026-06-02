import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, User, Search, ShoppingCart, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { useCart } from "@/store/cart-store";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, type ReactNode } from "react";
import { useWishlist } from "@/store/wishlist-store";

export function AppShell({ children, hideSearch }: { children: ReactNode; hideSearch?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cartCount = useCart((s) => s.count());
  const loadCart = useCart((s) => s.load);
  const loadWishlist = useWishlist((s) => s.load);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (user) {
      loadCart(user.id);
      loadWishlist(user.id);
    }
  }, [user, loadCart, loadWishlist]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button className="md:hidden text-foreground" aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/home"><Logo /></Link>
          {!hideSearch && (
            <form onSubmit={submit} className="ml-2 flex-1 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-full bg-muted pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Search for products, brands and more"
                />
              </div>
            </form>
          )}
          <nav className="ml-auto hidden md:flex items-center gap-6 text-sm">
            <Link to="/home" className="text-foreground hover:text-primary">Home</Link>
            <Link to="/categories" className="text-foreground hover:text-primary">Categories</Link>
            <Link to="/orders" className="text-foreground hover:text-primary">Orders</Link>
            <Link to="/wishlist" className="text-foreground hover:text-primary">Wishlist</Link>
            <Link to="/account" className="text-foreground hover:text-primary">Account</Link>
          </nav>
          <Link to="/cart" className="relative ml-auto md:ml-0 text-foreground">
            <ShoppingCart className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
        {!hideSearch && (
          <form onSubmit={submit} className="px-4 pb-3 md:hidden">
            <div className="relative" onClick={() => navigate({ to: "/search", search: { q: "" } })}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                readOnly
                className="w-full rounded-full bg-muted pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                placeholder="Search DKart"
              />
            </div>
          </form>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          <BottomLink to="/home" icon={<Home className="h-5 w-5" />} label="Home" />
          <BottomLink to="/categories" icon={<LayoutGrid className="h-5 w-5" />} label="Categories" />
          <BottomLink to="/wishlist" icon={<Heart className="h-5 w-5" />} label="Wishlist" />
          <BottomLink to="/account" icon={<User className="h-5 w-5" />} label="Account" />
        </div>
      </nav>
    </div>
  );
}

function BottomLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to;
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-2.5 text-xs ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}
    >
      {icon}
      {label}
    </Link>
  );
}
