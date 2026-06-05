import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import toast from "react-hot-toast";
import { Shield, ShieldOff, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminToggleUserAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const toggleAdminFn = useServerFn(adminToggleUserAdmin);

  const load = async () => {
    const [{ data: profiles }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setUsers(profiles ?? []);
    const map: Record<string, string[]> = {};
    (r ?? []).forEach((row: any) => {
      map[row.user_id] = [...(map[row.user_id] || []), row.role];
    });
    setRoles(map);
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    const r = await toggleAdminFn({ data: { user_id: userId, make_admin: !isAdmin } });
    if (r.error) return toast.error(r.error);
    toast.success(isAdmin ? "Admin revoked" : "Promoted to admin");
    load();
  };

  const filtered = users.filter((u) =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Users ({users.length})</h1>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email"
          className="w-full rounded-full bg-card border border-border pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const userRoles = roles[u.id] || ["customer"];
              const isAdmin = userRoles.includes("admin");
              return (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {userRoles.map((r) => (
                        <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleAdmin(u.id, isAdmin)} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${isAdmin ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {isAdmin ? <><ShieldOff className="h-3 w-3" /> Revoke</> : <><Shield className="h-3 w-3" /> Make Admin</>}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No users</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
