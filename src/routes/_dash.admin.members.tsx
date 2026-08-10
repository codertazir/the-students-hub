import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { ONLINE_WINDOW_MS, useAuth, useDB } from "@/lib/auth";
import { setDB } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dash/admin/members")({
  head: () => ({
    meta: [
      { title: "Members — Admin — The Students Hub" },
      { name: "description", content: "Manage club members, roles and view activity." },
      { property: "og:title", content: "Members — Admin" },
      { property: "og:description", content: "Search, promote and inspect member accounts." },
    ],
  }),
  component: MembersPage,
});

function initials(name: string, email: string) {
  const src = name || email;
  return src
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
}

function MembersPage() {
  const { user } = useAuth();
  const db = useDB();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const online = new Set(
    Object.entries(db.presence)
      .filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS)
      .map(([id]) => id),
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return db.users;
    return db.users.filter((u) => u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }, [db.users, q]);

  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const detail = db.users.find((u) => u.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Search members, manage roles, and review individual activity." />

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="max-w-sm" />

      <div className={cn("gap-5", detail ? "grid lg:grid-cols-[1.4fr_1fr]" : "block")}>
        <div className="surface-card rise-in overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u.id === selected ? null : u.id)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage src={u.avatar} alt={u.fullName} />
                        <AvatarFallback>{initials(u.fullName, u.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.fullName || "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", u.isAdmin ? "bg-primary-soft text-accent-foreground" : "bg-secondary text-muted-foreground")}>
                      {u.isAdmin ? "Admin" : "Member"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.dob || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {online.has(u.id) ? (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <span className="size-2 rounded-full bg-primary" /> Online
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Offline</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-secondary"
                      onClick={() => {
                        setDB((d) => {
                          const target = d.users.find((x) => x.id === u.id);
                          if (target) target.isAdmin = !target.isAdmin;
                        });
                        toast.success(u.isAdmin ? "Demoted to member." : "Promoted to admin.");
                      }}
                    >
                      {u.isAdmin ? <ShieldOff className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                      {u.isAdmin ? "Demote" : "Promote"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No members match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {detail && (
          <aside className="surface-card rise-in h-fit space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={detail.avatar} alt={detail.fullName} />
                <AvatarFallback>{initials(detail.fullName, detail.email)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <UserCog className="size-4" /> {detail.fullName || detail.email}
                </h2>
                <p className="text-xs text-muted-foreground">{detail.email}</p>
              </div>
            </div>

            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Recent logins</h3>
            <ul className="space-y-1.5 text-sm">
              {db.logins
                .filter((l) => l.userId === detail.id)
                .slice(0, 5)
                .map((l) => (
                  <li key={l.id} className="rounded-lg bg-secondary/50 px-3 py-2">
                    {new Date(l.ts).toLocaleString()}
                    <span className="block text-xs text-muted-foreground">{l.ip} · {l.device}</span>
                  </li>
                ))}
              {db.logins.filter((l) => l.userId === detail.id).length === 0 && (
                <p className="text-xs text-muted-foreground">No logins recorded.</p>
              )}
            </ul>

            <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Activity events</span>
              <span className="font-semibold">{db.activity.filter((a) => a.userId === detail.id).length}</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
