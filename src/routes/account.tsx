import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Inbox, Heart, Clock, MapPin, Settings, HelpCircle, LogOut, BadgeIndianRupee, Ticket } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — DKart" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (user) supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-xl font-bold">
            {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-lg">{profile?.full_name || "DKart Customer"}</p>
            <p className="text-sm opacity-90">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">GOLD MEMBER</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <div className="flex items-center gap-1 text-xs opacity-90"><BadgeIndianRupee className="h-3 w-3" /> DKart Pay</div>
            <p className="font-bold text-xl">₹0</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <div className="flex items-center gap-1 text-xs opacity-90"><Ticket className="h-3 w-3" /> Vouchers</div>
            <p className="font-bold text-xl">0</p>
          </div>
        </div>
        {profile?.referral_code && (
          <p className="mt-3 text-xs opacity-90">Your referral code: <span className="font-bold">{profile.referral_code}</span></p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-card border border-border overflow-hidden">
        <MenuItem icon={Package} label="My Orders" to="/cart" />
        <MenuItem icon={Inbox} label="Inbox" />
        <MenuItem icon={Heart} label="Saved Items" to="/wishlist" />
        <MenuItem icon={Clock} label="Recently Viewed" />
        <MenuItem icon={MapPin} label="Address Book" />
        <MenuItem icon={Settings} label="Account Management" />
      </div>

      {isAdmin && (
        <Link to="/admin" className="mt-4 block rounded-2xl bg-foreground text-background p-4 text-center font-semibold">
          Open Admin Dashboard →
        </Link>
      )}

      <div className="mt-4 rounded-2xl bg-card border border-border overflow-hidden">
        <MenuItem icon={HelpCircle} label="Help Center" />
        <button
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          className="flex w-full items-center gap-3 px-4 py-4 text-destructive border-t border-border"
        >
          <LogOut className="h-5 w-5" /> <span className="font-semibold">Logout</span>
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">DKart v1.0.0</p>
    </AppShell>
  );
}

function MenuItem({ icon: Icon, label, to }: { icon: any; label: string; to?: string }) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 border-border hover:bg-muted/50">
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      <span className="text-muted-foreground">›</span>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : <button className="w-full text-left">{content}</button>;
}
