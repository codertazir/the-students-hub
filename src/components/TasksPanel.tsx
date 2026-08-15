import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Plus } from "lucide-react";
import { notify, setDB, uid, userLabel, visibleTasks, type Task } from "@/lib/store";
import { useAuth, useDB } from "@/lib/auth";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

/** Shared tasks list used by the home card and the dedicated Tasks page. */
export function TasksPanel({ limit = 3, showComposer = true }: { limit?: number; showComposer?: boolean }) {
  const { user } = useAuth();
  const db = useDB();
  const [expanded, setExpanded] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("me");

  if (!user) return null;
  const me = user;

  const mine = visibleTasks(db, me.id);
  const open_ = mine.filter((t) => !t.done);
  const done = mine.filter((t) => t.done);
  const shown = expanded ? open_ : open_.slice(0, limit);

  function toggle(task: Task) {
    setDB((d) => {
      const t = d.tasks.find((x) => x.id === task.id);
      if (!t) return;
      t.done = !t.done;
      if (t.done) t.completedAt = Date.now();
      else delete t.completedAt;
      track(
        "tasks",
        `marked the task "${t.title}" as ${t.done ? "done" : "not done"}`,
        t.due ? `Due ${t.due}` : null,
        { taskId: t.id },
      );
    });
    // Notify whoever assigned the task when someone else completes it.
    if (!task.done && task.createdBy !== "system" && task.createdBy !== me.id) {
      notify({
        title: "Task completed",
        body: `${me.fullName || me.email} finished “${task.title}”.`,
        targets: [task.createdBy],
        cta: { label: "Open tasks", to: "/tasks" },
      });
    }
  }

  function create() {
    if (!title.trim()) return;
    setDB((d) => {
      d.tasks.unshift({
        id: uid(),
        title: title.trim(),
        due: due.trim() || "No due date",
        done: false,
        createdBy: me.id,
        assignedTo: assignee === "me" ? me.id : assignee === "all" ? "all" : assignee,
        createdAt: Date.now(),
      });
    });
    track(
      "tasks",
      `created the task "${title.trim()}"`,
      assignee === "me" ? "Assigned to themselves" : assignee === "all" ? "Assigned to everyone" : "Assigned to a member",
    );
    if (assignee !== "me" && assignee !== "all") {
      notify({
        title: "New task assigned to you",
        body: `${me.fullName || me.email} assigned “${title.trim()}” to you.`,
        targets: [assignee],
        cta: { label: "Open tasks", to: "/tasks" },
      });
    }
    setTitle("");
    setDue("");
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {shown.map((t) => (
          <li key={t.id} className="fade-slide">
            <button
              onClick={() => toggle(t)}
              className="press flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-secondary"
            >
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors" />
              <span className="min-w-0 flex-1">
                {t.title}
                <span className="block text-xs text-muted-foreground">
                  Due {t.due}
                  {t.assignedTo !== "all" && t.assignedTo !== me.id && ` · ${userLabel(db, t.assignedTo)}`}
                  {t.createdBy !== "system" && t.createdBy !== me.id && ` · from ${userLabel(db, t.createdBy)}`}
                </span>
              </span>
            </button>
          </li>
        ))}
        {open_.length === 0 && <li className="px-2 text-sm text-muted-foreground">Nothing open — nice work.</li>}
      </ul>

      {open_.length > limit && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary transition-opacity hover:opacity-70"
        >
          {expanded ? "Show fewer" : `Show all ${open_.length} tasks`}
        </button>
      )}

      {showComposer && (
        <div>
          {open ? (
            <div className="fade-slide space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  placeholder="Due (e.g. Sunday)"
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none"
                >
                  <option value="me">Myself</option>
                  <option value="all">Everyone</option>
                  {db.users
                    .filter((u) => u.id !== me.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={create}
                  className="press rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Add task
                </button>
                <button onClick={() => setOpen(false)} className="px-2 text-xs text-muted-foreground hover:underline">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
            >
              <Plus className="size-3.5" /> New task
            </button>
          )}
        </div>
      )}

      {done.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform duration-300", showDone && "rotate-180")} />
            Completed tasks ({done.length})
          </button>
          {showDone && (
            <ul className="fade-slide mt-2 space-y-1">
              {done.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => toggle(t)}
                    className="flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="line-through">{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
