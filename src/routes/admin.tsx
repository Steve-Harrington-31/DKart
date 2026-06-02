import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — DKart" }] }),
  component: AdminPlaceholder,
});

function AdminPlaceholder() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);
  if (!user) return null;
  return (
    <AppShell>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        {!isAdmin ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Your account doesn't have admin access yet. To grant yourself admin in this build, ask me to "make me admin" — I'll insert a row in <code>user_roles</code>.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Coming in Phase 3 — full admin panel with products, orders, users & reports.</p>
        )}
      </div>
    </AppShell>
  );
}
