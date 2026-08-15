import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, KeyRound, ShieldAlert, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth } from "@/lib/auth";
import { AUTH_EVENT_LABEL, isOnline, useMonitoring } from "@/lib/monitoring";
import { cn } from "@/lib/utils";

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

const EVENT_TONE: Record<string, string> = {
  sign_in: "bg-primary-soft text-accent-foreground",
  account_created: "bg-primary-soft text-accent-foreground",
  sign_out: "bg-secondary text-muted-foreground",
  password_change: "bg-secondary text-foreground",
  failed_login: "bg-destructive/15 text-destructive",
};

function MonitoringPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const { data, error } = useMonitoring(isAdmin);
  const [q, setQ] = useState("");
  const [aq, setAq] = useState("");

  const logins = useMemo(() => {
    const rows = data?.logins ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((l) =>
      [l.email, l.name, l.ipAddress, l.browser, l.os, l.deviceType, l.event]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data?.logins, q]);

  const activity = useMemo(() => {
    const rows = data?.activity ?? [];
    const term = aq.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((a) =>
      [a.email, a.name, a.action, a.area, a.detail, a.ipAddress]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data?.activity, aq]);

  if (!user) return null;
  if (!isAdmin) return <AdminOnly />;

  const users = data?.users ?? [];
  const online = users.filter((u) => isOnline(u.lastActiveAt));
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const signInsToday = (data?.logins ?? []).filter(
    (l) => l.event === "sign_in" && new Date(l.timestamp).getTime() >= startOfDay,
  ).length;
  const failedToday = (data?.logins ?? []).filter(
    (l) => l.event === "failed_login" && new Date(l.timestamp).getTime() >= startOfDay,
  ).length;

  const stats = [
    { label: "Members", value: users.length, icon: Users },
    { label: "Sign-ins today", value: signInsToday, icon: KeyRound },
    { label: "Failed logins today", value: failedToday, icon: ShieldAlert },
    { label: "Online now", value: online.length, icon: Activity },
    { label: "Activity events", value: data?.activity.length ?? 0, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        description="Live security overview straight from the database — sign-ins, activity and who's online."
      />

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

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
          {online.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs text-accent-foreground"
            >
              <span className="size-1.5 rounded-full bg-primary" /> {u.displayName}
            </span>
          ))}
          {online.length === 0 && <p className="text-sm text-muted-foreground">No one is online right now.</p>}
        </div>
      </section>

      <section className="surface-card rise-in space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Login log ({data?.logins.length ?? 0})</h2>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, IP, event…"
            className="w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                {["Event", "Member", "Email", "Timestamp", "IP address", "Device", "Browser / OS", "Session", "Details", "User agent"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs", EVENT_TONE[l.event] ?? "bg-secondary")}>
                      {AUTH_EVENT_LABEL[l.event] ?? l.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{l.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.deviceType ?? l.device ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {(l.browser ?? "—") + " / " + (l.os ?? "—")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {l.sessionId ? l.sessionId.slice(0, 8) : "—"}
                  </td>
                  <td className="max-w-56 px-4 py-3 text-xs text-muted-foreground">{l.detail ?? "—"}</td>
                  <td className="max-w-64 truncate px-4 py-3 text-xs text-muted-foreground" title={l.userAgent ?? ""}>
                    {l.userAgent ?? "—"}
                  </td>
                </tr>
              ))}
              {logins.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                    {data ? "No login records match." : "Loading login records…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Passwords are never viewable — only salted hashes are stored. This table refreshes itself every few seconds.
        </p>
      </section>

      <section className="surface-card rise-in">
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
          <h2 className="text-sm font-semibold">Activity log ({data?.activity.length ?? 0})</h2>
          <Input
            value={aq}
            onChange={(e) => setAq(e.target.value)}
            placeholder="Search activity…"
            className="w-64"
          />
        </div>
        <div className="divide-y divide-border">
          {activity.map((a) => (
            <div key={a.id} className="space-y-1 px-5 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-accent-foreground">{a.area}</span>
                <span className="font-medium">{a.name || a.email}</span>
                <span className="text-muted-foreground">{a.action}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(a.ts).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {[a.detail, a.ipAddress, a.browser && a.os ? `${a.browser} on ${a.os}` : null, a.deviceType]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              {a.metadata && (
                <p className="truncate font-mono text-[11px] text-muted-foreground" title={a.metadata}>
                  {a.metadata}
                </p>
              )}
            </div>
          ))}
          {activity.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              {data ? "No activity matches." : "Loading activity…"}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
