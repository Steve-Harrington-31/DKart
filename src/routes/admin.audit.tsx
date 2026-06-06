import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

type Row = {
  id: string;
  actor_id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  actor?: { full_name: string | null; email: string | null } | null;
};

const ENTITIES = ["all", "product", "category", "coupon", "order", "user_role"] as const;

function AdminAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState<(typeof ENTITIES)[number]>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("admin_audit_log")
        .select("*, actor:profiles!admin_audit_log_actor_id_fkey(full_name,email)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (entity !== "all") q = q.eq("entity", entity);
      const { data } = await q;
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [entity]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <div className="flex gap-1 overflow-x-auto">
          {ENTITIES.map((e) => (
            <button
              key={e}
              onClick={() => setEntity(e)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                entity === e ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No audit entries</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.actor?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.actor?.email ?? r.actor_id.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{r.entity}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{r.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.entity_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all max-w-md">
                    {Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : "—"}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
