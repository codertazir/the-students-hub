import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Home,
  LogOut,
  LayoutGrid,
  Megaphone,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
  Wallet,
  ListTodo,
  Lightbulb,
  Map,
  ShieldCheck,
} from "lucide-react";
import logo from "@/assets/students-hub-logo.png.asset.json";
import symbol from "@/assets/students-hub-symbol.png.asset.json";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ONLINE_WINDOW_MS, useAuth, useDB } from "@/lib/auth";
import { setDB, visibleNotifications } from "@/lib/store";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { ROLE_LABEL, can, type Permission } from "@/lib/permissions";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { to: "/master-plan", label: "Master Plan", icon: Map },
] as const;

const ADMIN_NAV = [
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/suggestions", label: "Suggestions", icon: Lightbulb },
  { to: "/admin/home", label: "Home layout", icon: LayoutGrid },
  { to: "/admin/meeting", label: "Meeting", icon: CalendarDays },
  { to: "/admin/funds", label: "Funds", icon: Wallet },
  { to: "/admin/tasks", label: "Tasks", icon: ListTodo },
  { to: "/admin/members", label: "Members", icon: Users, permission: "manage:members" },
  { to: "/admin/monitoring", label: "Monitoring", icon: ShieldCheck, permission: "view:monitoring" },
] as const satisfies readonly {
  to: string;
  label: string;
  icon: typeof Users;
  permission?: Permission;
}[];

export function DashboardShell() {
  const { user, loading, signOut } = useAuth();
  const db = useDB();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(264);
  const [query, setQuery] = useState("");
  const dragging = useRef(false);

  useEffect(() => {
    // Wait for the server session to restore, otherwise a hard refresh of any
    // dashboard URL bounces to /log-in and then back to /home.
    if (!loading && !user) navigate({ to: "/log-in" });
  }, [user, loading, navigate]);

  const onMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    setWidth(Math.min(380, Math.max(200, e.clientX)));
  }, []);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [onMove]);

  if (!user) return null;
  if (!user.onboarded) return <OnboardingDialog />;

  const inbox = visibleNotifications(db, user.id);
  const unread = inbox.filter((n) => !n.read).length;
  const online = Object.entries(db.presence).filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS);
  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();

  const q = query.trim().toLowerCase();
  const hit = (...parts: (string | undefined)[]) =>
    parts.some((p) => (p ?? "").toLowerCase().includes(q));
  const results: {
    key: string;
    label: string;
    sub?: string | undefined;
    kind: string;
    go: () => void;
  }[] = q
    ? [
        ...db.notes
          .filter((n) => hit(n.title, `#${n.number}`, n.blocks.map((b) => b.content).join(" ")))
          .map((n) => ({
            key: `note-${n.id}`,
            label: n.title,
            sub: n.dateLabel,
            kind: "Note",
            go: () => void navigate({ to: "/notes/$id", params: { id: n.id } }),
          })),
        ...db.events
          .filter((e) =>
            hit(e.title, `#${e.number}`, e.location, e.blocks.map((b) => b.content).join(" ")),
          )
          .map((e) => ({
            key: `event-${e.id}`,
            label: e.title,
            sub: `${e.dateLabel} · ${e.location}`,
            kind: "Event",
            go: () => void navigate({ to: "/events/$id", params: { id: e.id } }),
          })),
        ...db.announcements
          .filter((a) => !a.archived && hit(a.title, a.body))
          .map((a) => ({
            key: `ann-${a.id}`,
            label: a.title,
            sub: a.body,
            kind: "Announcement",
            go: () => void navigate({ to: "/home" }),
          })),
        ...db.tasks
          .filter(
            (t) =>
              (t.assignedTo === "all" || t.assignedTo === user.id || user.isAdmin) && hit(t.title),
          )
          .map((t) => ({
            key: `task-${t.id}`,
            label: t.title,
            sub: t.due ? `Due ${t.due}` : undefined,
            kind: "Task",
            go: () => void navigate({ to: "/tasks" }),
          })),
        ...db.suggestions
          .filter((s) => hit(s.title, s.body))
          .map((s) => ({
            key: `sug-${s.id}`,
            label: s.title,
            sub: s.body,
            kind: "Suggestion",
            go: () => void navigate({ to: "/home" }),
          })),
        ...(can(user.role, "manage:members")
          ? db.users
              .filter((u) => hit(u.fullName, u.email))
              .map((u) => ({
                key: `user-${u.id}`,
                label: u.fullName || u.email,
                sub: u.email,
                kind: "Member",
                go: () => void navigate({ to: "/admin/members" }),
              }))
          : []),
      ]
    : [];

  return (
    <div className="flex min-h-screen w-full bg-secondary/40">
      <aside
        style={{ width: collapsed ? 76 : width }}
        className="relative hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:sticky md:top-0 md:flex"
      >
        <div className="flex items-center gap-2 px-3 py-4">
          {!collapsed && (
            <Link
              to="/home"
              className="press flex min-w-0 flex-1 items-center transition-opacity hover:opacity-80"
            >
              <img
                src={logo.url}
                alt="The Students Hub"
                className="h-8 w-auto shrink-0 object-contain"
              />
            </Link>
          )}
          {collapsed && (
            <Link
              to="/home"
              className="press flex flex-1 items-center justify-center transition-opacity hover:opacity-80"
              title="The Students Hub"
            >
              <img
                src={symbol.url}
                alt="The Students Hub"
                className="h-8 w-8 shrink-0 object-contain"
              />
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="press flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to &&
                  "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground",
              )}
              title={item.label}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
          {user.isAdmin && (
            <div className="mt-3 space-y-1 border-t border-sidebar-border pt-3">
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
              )}
              {ADMIN_NAV.filter(
                (item) => !("permission" in item) || can(user.role, item.permission),
              ).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    pathname === item.to &&
                      "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/account"
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="size-9 shrink-0">
              {user.avatar && <AvatarImage src={user.avatar} alt="" />}
              <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {user.fullName || "Member"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]} · {user.email}
                </span>
              </span>
            )}
          </Link>
        </div>

        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={() => {
              dragging.current = true;
              document.body.style.userSelect = "none";
            }}
            className="absolute inset-y-0 -right-1 w-2 cursor-col-resize transition-colors hover:bg-primary/20"
          />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, events, tasks, announcements…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  results[0].go();
                  setQuery("");
                } else if (e.key === "Escape") setQuery("");
              }}
              className="w-full rounded-full border border-input bg-secondary/60 py-2 pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
            />
            {q.length > 0 && results.length === 0 && (
              <div className="surface-card absolute left-0 right-0 top-11 z-30 p-3 text-sm text-muted-foreground">
                No matches for “{query.trim()}”.
              </div>
            )}
            {results.length > 0 && (
              <div className="surface-card absolute left-0 right-0 top-11 z-30 overflow-hidden p-1">
                {results.slice(0, 8).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      r.go();
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{r.label}</span>
                      {r.sub && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.sub}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{r.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user.isAdmin && (
              <span className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                {online.length} online
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                  <Bell className="size-4" />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setDB((d) => d.notifications.forEach((n) => (n.read = true)))}
                  >
                    Mark all read
                  </button>
                </div>
                {inbox.length === 0 && (
                  <p className="px-2 py-4 text-sm text-muted-foreground">Nothing yet.</p>
                )}
                {inbox.map((n) => (
                  <div key={n.id} className="rounded-lg p-2 transition-colors hover:bg-secondary">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    {n.cta && (
                      <Link
                        to={n.cta.to}
                        className="mt-2 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        {n.cta.label}
                      </Link>
                    )}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
