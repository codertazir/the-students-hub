import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDB } from "@/lib/auth";
import { TaskDialog } from "@/components/masterplan/TaskDialog";
import { assigneeLabel, deleteTask, toggleTaskDone, type PlanActor } from "@/lib/masterplan";
import {
  PLAN_PRIORITIES,
  PLAN_PRIORITY_LABELS,
  PLAN_TASK_STATUSES,
  PLAN_TASK_STATUS_LABELS,
  type PlanTask,
} from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: PlanActor;
}

type SortKey = "created" | "due" | "priority" | "status" | "project";

const select =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring/30";

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "—");

export function AdminTasksSheet({ open, onOpenChange, actor }: Props) {
  const db = useDB();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [project, setProject] = useState("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const projectName = (id: string) => db.planProjects.find((p) => p.id === id)?.name ?? "Unassigned project";
  const userName = (id: string) => {
    const u = db.users.find((x) => x.id === id);
    return u?.preferredName || u?.fullName || u?.email || "System";
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = db.planTasks.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (project !== "all" && t.projectId !== project) return false;
      if (assignee === "everyone" && t.assignees !== "all") return false;
      if (assignee !== "all" && assignee !== "everyone") {
        if (t.assignees === "all" || !t.assignees.includes(assignee)) return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        projectName(t.projectId).toLowerCase().includes(q) ||
        userName(String(t.createdBy)).toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "due") return (a.due || "9999").localeCompare(b.due || "9999");
      if (sort === "priority") return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "project") return projectName(a.projectId).localeCompare(projectName(b.projectId));
      return b.createdAt - a.createdAt;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, query, status, priority, assignee, project, sort]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>All tasks</SheetTitle>
            <SheetDescription>
              Every task in the master plan — including private assignments — with full history.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2 border-b border-border px-5 py-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects or creators…"
              className="h-9"
            />
            <div className="flex flex-wrap gap-2">
              <select className={select} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">Any status</option>
                {PLAN_TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PLAN_TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select className={select} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="all">Any priority</option>
                {PLAN_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PLAN_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
              <select className={select} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="all">Anyone</option>
                <option value="everyone">Assigned to everyone</option>
                {db.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </select>
              <select className={select} value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="all">All projects</option>
                {db.planProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select className={select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="created">Newest first</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No tasks match these filters.</p>}
            {rows.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <button className="mt-0.5" onClick={() => toggleTaskDone(t.id, actor)} title="Toggle completion">
                    {t.done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {projectName(t.projectId)} · {assigneeLabel(db, t)} · {PLAN_TASK_STATUS_LABELS[t.status]} ·{" "}
                      {PLAN_PRIORITY_LABELS[t.priority]}
                      {t.due ? ` · due ${t.due}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      title="Edit or reassign"
                      onClick={() => {
                        setEditing(t);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      title="Delete task"
                      onClick={() => deleteTask(t.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <button
                      className="text-muted-foreground transition-transform hover:text-foreground"
                      title="Details"
                      onClick={() => setExpanded((cur) => (cur === t.id ? null : t.id))}
                    >
                      <ChevronDown className={`size-4 transition-transform ${expanded === t.id ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {expanded === t.id && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    {t.description && <p className="text-foreground/80">{t.description}</p>}
                    <div className="grid gap-1 sm:grid-cols-2">
                      <p>Created by {userName(String(t.createdBy))}</p>
                      <p>Created {fmt(t.createdAt)}</p>
                      <p>Last updated {fmt(t.updatedAt)}</p>
                      <p>
                        Completed {t.completedAt ? `${fmt(t.completedAt)} by ${userName(String(t.completedBy))}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-foreground">History</p>
                      {t.history.length === 0 && <p>No history recorded.</p>}
                      <ul className="space-y-0.5">
                        {[...t.history].reverse().map((h, i) => (
                          <li key={`${h.ts}-${i}`}>
                            {h.byName} {h.action} · {fmt(h.ts)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {rows.length} task{rows.length === 1 ? "" : "s"} shown
            <Button variant="ghost" size="sm" className="float-right h-7 rounded-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {editing && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          actor={actor}
          projectId={editing.projectId}
          task={editing}
        />
      )}
    </>
  );
}
