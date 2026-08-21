import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarRange,
  ExternalLink,
  ListFilter,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth, useDB } from "@/lib/auth";
import { AdminTasksPanel } from "@/components/masterplan/AdminTasksSheet";
import { PlanSettingsPanel } from "@/components/masterplan/PlanSettingsSheet";
import { ProjectDialog } from "@/components/masterplan/ProjectDialog";
import { TasksCell } from "@/components/masterplan/TasksCell";
import {
  deleteProject,
  moveProjectToMonth,
  moveProjectWithinMonth,
  projectsForMonth,
  type PlanActor,
} from "@/lib/masterplan";
import {
  MONTH_NAMES,
  PLAN_COLUMN_LABELS,
  PLAN_PRIORITIES,
  PLAN_PRIORITY_LABELS,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  type DB,
  type PlanColumnId,
  type PlanProject,
} from "@/lib/store";

export const Route = createFileRoute("/master-plan")({
  head: () => ({
    meta: [
      { title: "Master Plan — The Students Hub" },
      {
        name: "description",
        content:
          "Plan and track every club project and event across the year, month by month, with shared tasks and live progress.",
      },
      { property: "og:title", content: "Master Plan — The Students Hub" },
      {
        property: "og:description",
        content: "Month-by-month planning board for all club projects, events and tasks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MasterPlanPage,
});

type SortKey = "manual" | "name" | "start" | "priority" | "progress" | "status";

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring/30";

const statusTone: Record<string, string> = {
  planned: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/15 text-primary",
  blocked: "bg-destructive/15 text-destructive",
  done: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-muted text-muted-foreground",
};

const priorityTone: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-amber-500/15 text-amber-600",
  urgent: "bg-destructive/15 text-destructive",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      {children}
    </span>
  );
}

function MasterPlanPage() {
  const { user, loading } = useAuth();
  const db = useDB();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<SortKey>("manual");
  const [panel, setPanel] = useState<"tasks" | "layout" | null>(null);
  const [projectDialog, setProjectDialog] = useState<{
    open: boolean;
    project: PlanProject | null;
    month: number;
  }>({
    open: false,
    project: null,
    month: 0,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/log-in" });
  }, [loading, user, navigate]);

  const actor: PlanActor | null = user
    ? { id: user.id, fullName: user.fullName, email: user.email, isAdmin: user.isAdmin }
    : null;

  const columns = useMemo(() => db.planColumns.filter((c) => c.visible), [db.planColumns]);

  const filterAndSort = (list: PlanProject[]) => {
    const q = query.trim().toLowerCase();
    const filtered = list.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (priority !== "all" && p.priority !== priority) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.owner ?? "").toLowerCase().includes(q)
      );
    });
    if (sort === "manual") return filtered;
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "start") return (a.start || "9999").localeCompare(b.start || "9999");
      if (sort === "priority")
        return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      if (sort === "progress") return b.progress - a.progress;
      return a.status.localeCompare(b.status);
    });
  };

  if (!user || !actor) return null;

  const isAdmin = user.isAdmin;
  const totalProjects = db.planProjects.length;
  const totalTasks = db.planTasks.length;
  const doneTasks = db.planTasks.filter((t) => t.done).length;

  return (
    <div className="min-h-screen w-full bg-secondary/40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/home"
            className="press inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="size-3.5" /> Back to hub
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              Master Plan
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {totalProjects} project{totalProjects === 1 ? "" : "s"} · {doneTasks}/{totalTasks}{" "}
              tasks done
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="h-9 w-48 pl-8 text-xs"
              />
            </div>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Any status</option>
              {PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAN_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">Any priority</option>
              {PLAN_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PLAN_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="manual">Custom order</option>
              <option value="name">Name</option>
              <option value="start">Start date</option>
              <option value="priority">Priority</option>
              <option value="progress">Progress</option>
              <option value="status">Status</option>
            </select>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => setPanel((p) => (p === "tasks" ? null : "tasks"))}
                >
                  All tasks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => setPanel((p) => (p === "layout" ? null : "layout"))}
                >
                  <Settings2 className="mr-1.5 size-3.5" /> Layout
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div
        className={cn(
          "gap-5 px-4 py-6 transition-all duration-300 sm:px-6",
          panel ? "grid lg:grid-cols-[1.4fr_1fr]" : "block",
        )}
      >
      <main className="min-w-0 space-y-10">
        {db.planMonths.map((month) => {
          const rows = filterAndSort(projectsForMonth(db, month));
          return (
            <section key={month} className="rise-in">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {MONTH_NAMES[month]}
                </h2>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {rows.length} row{rows.length === 1 ? "" : "s"}
                </span>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setProjectDialog({ open: true, project: null, month })}
                  >
                    <Plus className="mr-1 size-3.5" /> Add
                  </Button>
                )}
              </div>

              <div className="surface-card overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                      <tr className="border-b border-border text-left">
                        {columns.map((c) => (
                          <th
                            key={c.id}
                            className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {PLAN_COLUMN_LABELS[c.id]}
                          </th>
                        ))}
                        {isAdmin && <th className="w-px px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={columns.length + (isAdmin ? 1 : 0)}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            <CalendarRange className="mx-auto mb-2 size-5 opacity-60" />
                            Nothing planned for {MONTH_NAMES[month]} yet.
                          </td>
                        </tr>
                      )}
                      {rows.map((project, index) => (
                        <tr
                          key={project.id}
                          className="border-b border-border/70 transition-colors last:border-0 hover:bg-secondary/50"
                        >
                          {columns.map((c) => (
                            <td key={c.id} className="px-4 py-3 align-top">
                              <Cell column={c.id} project={project} db={db} actor={actor} />
                            </td>
                          ))}
                          {isAdmin && (
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  title="Move up"
                                  disabled={sort !== "manual" || index === 0}
                                  onClick={() => moveProjectWithinMonth(project.id, -1)}
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  title="Move down"
                                  disabled={sort !== "manual" || index === rows.length - 1}
                                  onClick={() => moveProjectWithinMonth(project.id, 1)}
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                                <select
                                  className={selectClass}
                                  title="Move to month"
                                  value={project.month}
                                  onChange={(e) =>
                                    moveProjectToMonth(project.id, Number(e.target.value))
                                  }
                                >
                                  {db.planMonths.map((m) => (
                                    <option key={m} value={m}>
                                      {MONTH_NAMES[m]}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  title="Edit"
                                  onClick={() => setProjectDialog({ open: true, project, month })}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                  onClick={() => deleteProject(project.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })}
      </main>

        {panel && (
          <aside className="surface-card rise-in h-fit overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
            {panel === "tasks" ? (
              <AdminTasksPanel onClose={() => setPanel(null)} actor={actor} />
            ) : (
              <PlanSettingsPanel onClose={() => setPanel(null)} />
            )}
          </aside>
        )}
      </div>

      <ProjectDialog
        open={projectDialog.open}
        onOpenChange={(open) => setProjectDialog((s) => ({ ...s, open }))}
        actor={actor}
        project={projectDialog.project}
        defaultMonth={projectDialog.month}
      />
    </div>
  );
}

function Cell({
  column,
  project,
  db,
  actor,
}: {
  column: PlanColumnId;
  project: PlanProject;
  db: DB;
  actor: PlanActor;
}) {
  switch (column) {
    case "name":
      return <span className="font-medium">{project.name}</span>;
    case "description":
      return (
        <span className="line-clamp-2 block max-w-xs text-muted-foreground">
          {project.description || "—"}
        </span>
      );
    case "tasks":
      return <TasksCell projectId={project.id} actor={actor} />;
    case "progress":
      return (
        <div className="w-32">
          <Progress value={project.progress} className="h-2" />
          <span className="mt-1 block text-[11px] text-muted-foreground">{project.progress}%</span>
        </div>
      );
    case "status":
      return (
        <Pill tone={statusTone[project.status] ?? ""}>{PLAN_STATUS_LABELS[project.status]}</Pill>
      );
    case "priority":
      return (
        <Pill tone={priorityTone[project.priority] ?? ""}>
          {PLAN_PRIORITY_LABELS[project.priority]}
        </Pill>
      );
    case "event": {
      const event = project.eventId ? db.events.find((e) => e.id === project.eventId) : null;
      if (!event)
        return <span className="text-[11px] text-muted-foreground">No event page yet</span>;
      return (
        <Link
          to="/events/$id"
          params={{ id: event.id }}
          className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
        >
          <ExternalLink className="size-3.5" /> Open
        </Link>
      );
    }
    case "start":
      return (
        <span className="whitespace-nowrap text-muted-foreground">{project.start || "—"}</span>
      );
    case "end":
      return <span className="whitespace-nowrap text-muted-foreground">{project.end || "—"}</span>;
    case "owner":
      return <span className="text-muted-foreground">{project.owner || "—"}</span>;
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}
