import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Home,
  LogOut,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ONLINE_WINDOW_MS, useAuth, useDB } from "@/lib/auth";
import { setDB } from "@/lib/store";
import { OnboardingDialog } from "@/components/OnboardingDialog";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/events", label: "Events", icon: CalendarDays },
] as const;

export function DashboardShell() {
  const { user, signOut } = useAuth();
  const db = useDB();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(264);
  const [query, setQuery] = useState("");
  const dragging = useRef(false);

  useEffect(() => {
    if (!user) navigate({ to: "/log-in" });
  }, [user, navigate]);

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

  const unread = db.notifications.filter((n) => !n.read).length;
  const online = Object.entries(db.presence).filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS);
  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();

  const results = query.trim()
    ? [
        ...db.notes.filter((n) => n.title.toLowerCase().includes(query.toLowerCase())).map((n) => ({ label: n.title, kind: "Note", to: "/notes" as const })),
        ...db.events.filter((e) => e.title.toLowerCase().includes(query.toLowerCase())).map((e) => ({ label: e.title, kind: "Event", to: "/events" as const })),
        ...db.announcements.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())).map((a) => ({ label: a.title, kind: "Announcement", to: "/home" as const })),
      ]
    : [];

  return (
    <div className="flex min-h-screen w-full bg-secondary/40">
      <aside
        style={{ width: collapsed ? 76 : width }}
        className="relative hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex"
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="gradient-primary flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground">
            SH
          </span>
          {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">The Students Hub</span>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to && "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground",
              )}
              title={item.label}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
          {user.isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-sidebar-accent",
                pathname === "/admin" && "bg-primary text-primary-foreground hover:bg-primary",
              )}
              title="Admin Dashboard"
            >
              <ShieldCheck className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">Admin Dashboard</span>}
            </Link>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/account"
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="size-9 shrink-0">
              {user.avatar && <AvatarImage src={user.avatar} alt="" />}
              <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.fullName || "Member"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.isAdmin ? "Admin" : "Club member"} · {user.email}
                </span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse sidebar"}
          </button>
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
              placeholder="Search notes, events, announcements…"
              className="w-full rounded-full border border-input bg-secondary/60 py-2 pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
            />
            {results.length > 0 && (
              <div className="surface-card absolute left-0 right-0 top-11 z-30 overflow-hidden p-1">
                {results.slice(0, 6).map((r) => (
                  <Link
                    key={r.kind + r.label}
                    to={r.to}
                    onClick={() => setQuery("")}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="truncate">{r.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{r.kind}</span>
                  </Link>
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
                {db.notifications.length === 0 && (
                  <p className="px-2 py-4 text-sm text-muted-foreground">Nothing yet.</p>
                )}
                {db.notifications.map((n) => (
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
            <Button variant="ghost" size="icon" className="rounded-full" onClick={signOut} title="Sign out">
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