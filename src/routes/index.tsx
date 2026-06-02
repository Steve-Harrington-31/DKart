import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Truck, Shield, RotateCcw, HeadphonesIcon, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DKart — Everything You Need, All in One Place" },
      { name: "description", content: "Lightning-fast delivery across India. Shop electronics, fashion, beauty, home and more on DKart." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">Login</Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-6 md:p-10 text-primary-foreground">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Limited Time</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">Tech Deals</h2>
            <p className="mt-2 text-lg opacity-90">Up to 50% OFF on top brands</p>
            <ShoppingBag className="absolute right-6 bottom-6 h-32 w-32 opacity-20" />
            <div className="mt-6 flex gap-1">
              <span className="h-1.5 w-6 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-3xl bg-accent/15 p-5">
              <h3 className="text-lg font-bold text-foreground">Fashion Sale</h3>
              <p className="text-sm text-muted-foreground">Up to 40% OFF</p>
            </div>
            <div className="rounded-3xl bg-warning/15 p-5">
              <h3 className="text-lg font-bold text-foreground">Home Essentials</h3>
              <p className="text-sm text-muted-foreground">Up to 35% OFF</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-6">
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/20">
            <Truck className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Lightning-fast delivery at your hub</p>
            <p className="text-xs text-muted-foreground">Order before 6 PM, delivered tomorrow</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Everything You Need, All in One Place</h1>
        <p className="mt-2 text-muted-foreground">From daily essentials to the latest tech — discover unbeatable deals on DKart.</p>
        <div className="mt-6 flex flex-col gap-3 items-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="text-sm text-primary hover:underline">I already have an account</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-12 grid grid-cols-3 gap-3 pb-12">
        {[
          { icon: Shield, label: "Secure Pay" },
          { icon: RotateCcw, label: "Easy Returns" },
          { icon: HeadphonesIcon, label: "24/7 Help" },
        ].map((b) => (
          <div key={b.label} className="rounded-2xl bg-card border border-border p-4 text-center">
            <b.icon className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 text-xs font-semibold text-foreground">{b.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
