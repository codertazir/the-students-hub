import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, KeyRound, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { ONLINE_WINDOW_MS, useAuth, useDB } from "@/lib/auth";

export const Route = createFileRoute("/_dash/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — Admin — The Students Hub" },
      { name: "description", content: "Security monitoring: sign-ins, activity and online members." },
      { property: "og:title", content: "Monitoring — Admin" },
      { property: "og:description", content: "Login logs, activity logs and live presence." },
    ],
  }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const { user } = useAuth();
  const db = useDB();
  const [q, setQ] = useState("");

  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const online = Object.entries(db.presence).filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS);
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const signInsToday = db.logins.filter((l) => l.ts >= startOfDay).length;

  const logins = useMemo(() => {
    const term = q.trim().toLowerCase();
    const sorted = [...db.logins].sort((a, b) => b.ts - a.ts);
    if (!term) return sorted;
    return sorted.filter((l) => l.email.toLowerCase().includes(term) || l.ip.toLowerCase().includes(term));
  }, [db.logins, q]);

  const stats = [
    { label: "Members", value: db.users.length, icon: Users },
    { label: "Sign-ins today", value: signInsToday, icon: KeyRound },
    { label: "Online now", value: online.length, icon: Activity },
    { label: "Notes", value: db.notes.length, icon: Activity },
    { label: "Events", value: db.events.length, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring" description="Security overview: sign-ins, activity and who's online right now." />

      <div className="grid gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="surface-card rise-in p-5">
            <s.icon className="mb-2 size-4 text-muted-foreground" />
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="surface-card rise-in space-y-3 p-5">
        <h2 className="text-sm font-semibold">Currently online ({online.length})</h2>
        <div className="flex flex-wrap gap-2">
          {online.map(([id]) => {
            const u = db.users.find((x) => x.id === id);
            return (
              <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs text-accent-foreground">
                <span className="size-1.5 rounded-full bg-primary" /> {u?.fullName || u?.email || "Unknown"}
              </span>
            );
          })}
          {online.length === 0 && <p className="text-sm text-muted-foreground">No one is online right now.</p>}
        </div>
      </section>

      <section className="surface-card rise-in space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Login log ({db.logins.length})</h2>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or IP…" className="w-56" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                {["Email", "Timestamp", "IP address", "Device", "Browser / OS", "User agent"].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{l.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(l.ts).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.ip}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.device}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.browser} / {l.os}</td>
                  <td className="max-w-64 truncate px-4 py-3 text-xs text-muted-foreground" title={l.userAgent}>
                    {l.userAgent}
                  </td>
                </tr>
              ))}
              {logins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No login records match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Passwords are never viewable — only salted hashes are stored.</p>
      </section>

      <section className="surface-card rise-in divide-y divide-border">
        <h2 className="p-5 pb-0 text-sm font-semibold">Activity log ({db.activity.length})</h2>
        {[...db.activity].sort((a, b) => b.ts - a.ts).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-accent-foreground">{a.area}</span>
            <span className="font-medium">{a.email}</span>
            <span className="text-muted-foreground">{a.action}</span>
            <span className="ml-auto text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
          </div>
        ))}
        {db.activity.length === 0 && <p className="p-5 text-sm text-muted-foreground">No activity recorded yet.</p>}
      </section>
    </div>
  );
}
