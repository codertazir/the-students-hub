import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, KeyRound, LayoutDashboard, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ONLINE_WINDOW_MS, useAuth, useDB } from "@/lib/auth";
import { setDB, uid } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — The Students Hub" },
      { name: "description", content: "Admin tools: login records, activity logs, user management and online status." },
      { property: "og:title", content: "Admin Dashboard — The Students Hub" },
      { property: "og:description", content: "Login records, activity logs and user management." },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "accounts", label: "Accounts", icon: Users },
  { id: "logins", label: "Login tracking", icon: KeyRound },
  { id: "activity", label: "Activity logs", icon: Activity },
] as const;

function AdminPage() {
  const { user } = useAuth();
  const db = useDB();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("home");
  const [selected, setSelected] = useState<string | null>(null);

  if (!user) return null;
  if (!user.isAdmin)
    return (
      <div className="surface-card p-8 text-center">
        <h1 className="text-lg font-semibold">Admin only</h1>
        <p className="mt-1 text-sm text-muted-foreground">This area is restricted to the club admin.</p>
      </div>
    );

  const online = Object.entries(db.presence).filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS);
  const detail = db.users.find((u) => u.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>

      <nav className="surface-card sticky top-20 z-10 flex flex-wrap gap-1 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              tab === t.id ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </nav>

      {tab === "home" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Members", value: db.users.length },
              { label: "Online now", value: online.length },
              { label: "Logins recorded", value: db.logins.length },
              { label: "Logged actions", value: db.activity.length },
            ].map((s) => (
              <div key={s.label} className="surface-card p-5">
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">Send a notification</h2>
            <NotificationComposer />
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">Pinned announcements</h2>
            <AnnouncementComposer />
          </section>
        </div>
      )}

      {tab === "accounts" && (
        <div className={cn("gap-5", detail ? "grid lg:grid-cols-[1.3fr_1fr]" : "block")}>
          <div className="surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {db.users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u.id === selected ? null : u.id)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/50"
                  >
                    <td className="px-4 py-3 font-medium">{u.fullName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {online.some(([id]) => id === u.id) ? (
                        <span className="flex items-center gap-1.5 text-xs text-primary">
                          <span className="size-2 rounded-full bg-primary" /> Online
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Offline</span>
                      )}
                    </td>
                  </tr>
                ))}
                {db.users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {detail && (
            <aside className="surface-card rise-in h-fit p-5">
              <h2 className="text-sm font-semibold">{detail.fullName || detail.email}</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Email", detail.email],
                  ["Date of birth", detail.dob || "—"],
                  ["Phone", detail.phone || "—"],
                  ["Role", detail.isAdmin ? "Admin" : "Member"],
                  ["Joined", new Date(detail.createdAt).toLocaleString()],
                  ["Password", "Stored as salted SHA-256 hash — never viewable"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mt-5 text-xs font-semibold uppercase text-muted-foreground">Recent activity</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {db.activity
                  .filter((a) => a.userId === detail.id)
                  .slice(0, 6)
                  .map((a) => (
                    <li key={a.id} className="rounded-lg bg-secondary/50 px-3 py-2">
                      {a.action}
                      <span className="block text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </aside>
          )}
        </div>
      )}

      {tab === "logins" && (
        <div className="surface-card overflow-x-auto">
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
              {db.logins.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{l.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(l.ts).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.ip}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.device}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.browser} / {l.os}
                  </td>
                  <td className="max-w-64 truncate px-4 py-3 text-xs text-muted-foreground" title={l.userAgent}>
                    {l.userAgent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Passwords are never viewable — only salted hashes are stored.
          </p>
        </div>
      )}

      {tab === "activity" && (
        <div className="surface-card divide-y divide-border">
          {db.activity.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-accent-foreground">{a.area}</span>
              <span className="font-medium">{a.email}</span>
              <span className="text-muted-foreground">{a.action}</span>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
            </div>
          ))}
          {db.activity.length === 0 && <p className="p-6 text-sm text-muted-foreground">No activity recorded yet.</p>}
        </div>
      )}
    </div>
  );
}

function NotificationComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("");

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-full" />
      <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" className="rounded-full" />
      <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA label (optional)" className="rounded-full" />
      <Button
        className="rounded-full sm:col-span-3 sm:w-fit"
        disabled={!title.trim() || !body.trim()}
        onClick={() => {
          setDB((d) =>
            d.notifications.unshift({
              id: uid(),
              title: title.trim(),
              body: body.trim(),
              ts: Date.now(),
              read: false,
              ...(cta.trim() ? { cta: { label: cta.trim(), to: "/home" } } : {}),
            }),
          );
          setTitle("");
          setBody("");
          setCta("");
          toast.success("Notification sent to all members.");
        }}
      >
        <Plus className="size-4" /> Send notification
      </Button>
    </div>
  );
}

function AnnouncementComposer() {
  const db = useDB();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-full" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details" className="rounded-full" />
        <Button
          variant="outline"
          className="rounded-full"
          disabled={!title.trim()}
          onClick={() => {
            setDB((d) => d.announcements.unshift({ id: uid(), title: title.trim(), body: body.trim(), pinned: true, ts: Date.now() }));
            setTitle("");
            setBody("");
            toast.success("Announcement pinned.");
          }}
        >
          Pin
        </Button>
      </div>
      <ul className="space-y-2">
        {db.announcements.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{a.title}</span>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() =>
                setDB((d) => {
                  const target = d.announcements.find((x) => x.id === a.id);
                  if (target) target.pinned = !target.pinned;
                })
              }
            >
              {a.pinned ? "Unpin" : "Pin"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}