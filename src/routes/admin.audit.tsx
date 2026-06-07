import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Search, X } from "lucide-react";
import { adminGetAuditLogs } from "@/lib/admin.functions";

const auditSearchSchema = z.object({
  entity: fallback(z.string(), "").default(""),
  action: fallback(z.string(), "").default(""),
  entity_id: fallback(z.string(), "").default(""),
  date_from: fallback(z.string(), "").default(""),
  date_to: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log — DKart Admin" }] }),
  validateSearch: zodValidator(auditSearchSchema),
  loaderDeps: ({ search }) => ({
    entity: search.entity,
    action: search.action,
    entity_id: search.entity_id,
    date_from: search.date_from,
    date_to: search.date_to,
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(auditQueryOptions(deps)),
  component: AdminAudit,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-muted-foreground">No audit entries found.</div>,
});

function auditQueryOptions(deps: z.infer<typeof auditSearchSchema>) {
  const payload = {
    entity: deps.entity || undefined,
    action: deps.action || undefined,
    entity_id: deps.entity_id || undefined,
    date_from: deps.date_from || undefined,
    date_to: deps.date_to || undefined,
  };
  return queryOptions({
    queryKey: ["admin-audit-logs", payload],
    queryFn: () => adminGetAuditLogs({ data: payload }),
  });
}

const ENTITIES = ["all", "product", "category", "coupon", "order", "user_role"] as const;
const ACTIONS = [
  "create",
  "update",
  "delete",
  "activate",
  "deactivate",
  "status_change",
  "grant_admin",
  "revoke_admin",
] as const;

type AuditRow = {
  id: string;
  actor_id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  actor: { full_name: string | null; email: string | null } | null;
};

function AdminAudit() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.id });
  const getLogs = useServerFn(adminGetAuditLogs);
  const { data: rows } = useSuspenseQuery(auditQueryOptions(search));

  const hasFilters =
    search.entity || search.action || search.entity_id || search.date_from || search.date_to;

  const updateFilter = (patch: Partial<z.infer<typeof auditSearchSchema>>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  };

  const clearFilters = () => {
    navigate({ search: () => ({}) });
  };

  const auditRows = (rows ?? []) as AuditRow[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Entity</label>
          <select
            value={search.entity || "all"}
            onChange={(e) => updateFilter({ entity: e.target.value === "all" ? "" : e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e === "all" ? "All entities" : e}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Action</label>
          <select
            value={search.action || ""}
            onChange={(e) => updateFilter({ action: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Entity ID</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search.entity_id}
              onChange={(e) => updateFilter({ entity_id: e.target.value })}
              placeholder="UUID or partial"
              className="w-full rounded-lg border border-border bg-card pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">From</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={search.date_from}
              onChange={(e) => updateFilter({ date_from: e.target.value })}
              className="rounded-lg border border-border bg-card pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">To</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={search.date_to}
              onChange={(e) => updateFilter({ date_to: e.target.value })}
              className="rounded-lg border border-border bg-card pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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
            {auditRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  No audit entries match your filters
                </td>
              </tr>
            )}
            {auditRows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.actor?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.actor?.email ?? r.actor_id.slice(0, 8)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                    {r.entity}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{r.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {r.entity_id?.slice(0, 8) ?? "—"}
                </td>
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

      <div className="mt-3 text-xs text-muted-foreground">
        Showing {auditRows.length} {auditRows.length === 1 ? "entry" : "entries"}
      </div>
    </div>
  );
}
