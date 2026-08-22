import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, KeyRound, ShieldAlert, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { AUTH_EVENT_LABEL, isOnline, useMonitoring } from "@/lib/monitoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dash/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — Admin — The Students Hub" },
      {
        name: "description",
        content: "Security monitoring: sign-ins, activity and online members.",
      },
      { property: "og:title", content: "Monitoring — Admin" },
      {
        property: "og:description",
        content: "One unified activity log with filters and live presence.",
      },
    ],
  }),
  component: MonitoringPage,
});

type Entry = {
  id: string;
  ts: string;
  area: string;
  kind: string;
  name: string | null;
  email: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  metadata: string | null;
  authEvent?: string;
};

const FILTERS: { id: string; label: string; match: (e: Entry) => boolean }[] = [
  { id: "all", label: "All activities", match: () => true },
  { id: "auth", label: "Login activity", match: (e) => e.kind === "auth" },
  { id: "account", label: "Account changes", match: (e) => e.area === "account" },
  { id: "notes", label: "Notes", match: (e) => e.area === "notes" },
  { id: "events", label: "Events", match: (e) => e.area === "events" },
  { id: "tasks", label: "Tasks", match: (e) => e.area === "tasks" },
  { id: "polls", label: "Polls", match: (e) => e.area === "polls" },
  { id: "suggestions", label: "Suggestions", match: (e) => e.area === "suggestions" },
  { id: "announcements", label: "Announcements", match: (e) => e.area === "announcements" },
  { id: "notifications", label: "Notifications", match: (e) => e.area === "notifications" },
  {
    id: "comments",
    label: "Comments",
    match: (e) => e.area === "comments" || /comment|repl(y|ied)/i.test(e.action),
  },
  { id: "files", label: "Files", match: (e) => e.area === "files" },
  { id: "admin", label: "Admin actions", match: (e) => e.area === "admin" },
  {
    id: "other",
    label: "Other",
    match: (e) =>
      ![
        "auth",
        "account",
        "notes",
        "events",
        "tasks",
        "polls",
        "suggestions",
        "announcements",
        "notifications",
        "comments",
        "files",
        "admin",
      ].includes(e.area),
  },
];

function MonitoringPage() {
  const { user } = useAuth();
  const isAdmin = can(user?.role, "view:monitoring");
  const { data, error } = useMonitoring(isAdmin);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const entries = useMemo<Entry[]>(() => {
    const fromAuth: Entry[] = (data?.logins ?? []).map((l) => ({
      id: `login-${l.id}`,
      ts: l.timestamp,
      area: "auth",
      kind: "auth",
      name: l.name,
      email: l.email,
      action: AUTH_EVENT_LABEL[l.event] ?? l.event,
      detail: l.detail,
      ipAddress: l.ipAddress,
      browser: l.browser,
      os: l.os,
      deviceType: l.deviceType ?? l.device,
      metadata: l.sessionId ? `session ${l.sessionId.slice(0, 8)}` : null,
      authEvent: l.event,
    }));
    const fromActivity: Entry[] = (data?.activity ?? [])
      // Auth events already arrive through the login feed — avoid duplicates.
      .filter((a) => a.area !== "auth")
      .map((a) => ({
        id: `act-${a.id}`,
        ts: a.ts,
        area: a.area,
        kind: a.area,
        name: a.name,
        email: a.email,
        action: a.action,
        detail: a.detail,
        ipAddress: a.ipAddress,
        browser: a.browser,
        os: a.os,
        deviceType: a.deviceType,
        metadata: a.metadata,
      }));
    return [...fromAuth, ...fromActivity].sort((x, y) => y.ts.localeCompare(x.ts));
  }, [data?.logins, data?.activity]);

  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]!;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (!active.match(e)) return false;
      if (!term) return true;
      return [e.email, e.name, e.action, e.area, e.detail, e.ipAddress, e.browser, e.os]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [entries, active, q]);

  if (!user) return null;
  if (!isAdmin)
    return (
      <AdminOnly
        title="Administrators only"
        description="Monitoring is limited to full administrators."
      />
    );

  const users = data?.users ?? [];
  const online = users.filter((u) => isOnline(u.lastActiveAt));
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const todays = entries.filter((e) => new Date(e.ts).getTime() >= startOfDay);
  const signInsToday = todays.filter((e) => e.authEvent === "sign_in").length;
  const failedToday = todays.filter((e) => e.authEvent === "failed_login").length;

  const stats = [
    { label: "Members", value: users.length, icon: Users },
    { label: "Sign-ins today", value: signInsToday, icon: KeyRound },
    { label: "Failed logins today", value: failedToday, icon: ShieldAlert },
    { label: "Online now", value: online.length, icon: Activity },
    { label: "Activity events", value: entries.length, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        description="Live security overview straight from the database — one activity log covering sign-ins and every tracked action."
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
          {online.length === 0 && (
            <p className="text-sm text-muted-foreground">No one is online right now.</p>
          )}
        </div>
      </section>

      <section className="surface-card rise-in">
        <div className="space-y-3 p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Activity log ({filtered.length})</h2>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search person, action, IP…"
              className="w-64"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  filter === f.id
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((e) => (
            <div key={e.id} className="space-y-1 px-5 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs",
                    e.authEvent === "failed_login"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary-soft text-accent-foreground",
                  )}
                >
                  {e.area}
                </span>
                <span className="font-medium">{e.name || e.email}</span>
                <span className="text-muted-foreground">{e.action}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(e.ts).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  e.detail,
                  e.ipAddress,
                  e.browser && e.os ? `${e.browser} on ${e.os}` : null,
                  e.deviceType,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              {e.metadata && (
                <p
                  className="truncate font-mono text-[11px] text-muted-foreground"
                  title={e.metadata}
                >
                  {e.metadata}
                </p>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              {data ? "No activity matches this filter." : "Loading activity…"}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
