import { Link, Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, ListOrdered, Users, Tag, BarChart3, ArrowLeft, LogOut, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — DKart" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/orders", label: "Orders", icon: ListOrdered },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!loading && !user) { navigate({ to: "/login" }); return null; }
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account does not have admin privileges. Ask the DKart team to promote your account.</p>
          <Link to="/home" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Logo />
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase text-background">Admin</span>
          <Link to="/home" className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </Link>
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="text-sm text-destructive flex items-center gap-1">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden md:block w-56 flex-shrink-0">
          <nav className="space-y-1">
            {nav.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <div className="md:hidden mb-4 flex gap-2 overflow-x-auto">
            {nav.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                  <n.icon className="h-3.5 w-3.5" /> {n.label}
                </Link>
              );
            })}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
