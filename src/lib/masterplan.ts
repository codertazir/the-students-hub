/**
 * Master Plan data helpers.
 *
 * Projects/events live in `db.planProjects`, their tasks in `db.planTasks` and
 * the admin's month order / column layout in `db.planMonths` + `db.planColumns`.
 * All four keys are part of SHARED_KEYS, so every mutation here is persisted to
 * PostgreSQL and pushed to every other signed-in device automatically.
 */

import {
  setDB,
  uid,
  type DB,
  type ID,
  type PlanProject,
  type PlanTask,
  type PlanTaskEvent,
  type User,
} from "./store";

export type PlanActor = Pick<User, "id" | "fullName" | "email" | "isAdmin">;

const actorName = (actor: PlanActor) => actor.fullName || actor.email;

const stamp = (actor: PlanActor, action: string): PlanTaskEvent => ({
  ts: Date.now(),
  by: actor.id,
  byName: actorName(actor),
  action,
});

/* ---------------- months + columns (admin) ---------------- */

export function moveMonth(index: number, delta: number) {
  setDB((d) => {
    const next = index + delta;
    if (next < 0 || next >= d.planMonths.length) return;
    const [m] = d.planMonths.splice(index, 1);
    if (m !== undefined) d.planMonths.splice(next, 0, m);
  });
}

export function setMonthOrder(order: number[]) {
  setDB((d) => {
    d.planMonths = [...order];
  });
}

export function moveColumn(index: number, delta: number) {
  setDB((d) => {
    const next = index + delta;
    if (next < 0 || next >= d.planColumns.length) return;
    const [c] = d.planColumns.splice(index, 1);
    if (c) d.planColumns.splice(next, 0, c);
  });
}

export function toggleColumn(index: number) {
  setDB((d) => {
    const col = d.planColumns[index];
    if (col) col.visible = !col.visible;
  });
}

/* ---------------- projects (admin) ---------------- */

export type ProjectDraft = Omit<PlanProject, "id" | "order" | "createdAt" | "updatedAt" | "createdBy">;

export function createProject(draft: ProjectDraft, actor: PlanActor) {
  const id = uid();
  setDB((d) => {
    const order = d.planProjects.filter((p) => p.month === draft.month).length;
    d.planProjects.push({
      ...draft,
      id,
      order,
      createdBy: actor.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  return id;
}

export function updateProject(id: ID, patch: Partial<PlanProject>) {
  setDB((d) => {
    const p = d.planProjects.find((x) => x.id === id);
    if (p) Object.assign(p, patch, { updatedAt: Date.now() });
  });
}

export function deleteProject(id: ID) {
  setDB((d) => {
    d.planProjects = d.planProjects.filter((p) => p.id !== id);
    d.planTasks = d.planTasks.filter((t) => t.projectId !== id);
  });
}

export function moveProjectToMonth(id: ID, month: number) {
  setDB((d) => {
    const p = d.planProjects.find((x) => x.id === id);
    if (!p || p.month === month) return;
    p.month = month;
    p.order = d.planProjects.filter((x) => x.month === month && x.id !== id).length;
    p.updatedAt = Date.now();
    resequence(d, month);
  });
}

/** Swap a project with its neighbour inside the same month. */
export function moveProjectWithinMonth(id: ID, delta: number) {
  setDB((d) => {
    const project = d.planProjects.find((x) => x.id === id);
    if (!project) return;
    const siblings = d.planProjects
      .filter((p) => p.month === project.month)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((p) => p.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= siblings.length) return;
    const [moved] = siblings.splice(index, 1);
    if (moved) siblings.splice(next, 0, moved);
    siblings.forEach((p, i) => (p.order = i));
  });
}

function resequence(d: DB, month: number) {
  d.planProjects
    .filter((p) => p.month === month)
    .sort((a, b) => a.order - b.order)
    .forEach((p, i) => (p.order = i));
}

/* ---------------- tasks (any authenticated member) ---------------- */

export type TaskDraft = Pick<
  PlanTask,
  "projectId" | "title" | "description" | "assignees" | "due" | "priority" | "status"
>;

export function createTask(draft: TaskDraft, actor: PlanActor) {
  const id = uid();
  setDB((d) => {
    const done = draft.status === "done";
    d.planTasks.push({
      ...draft,
      id,
      done,
      createdBy: actor.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(done ? { completedAt: Date.now(), completedBy: actor.id } : {}),
      history: [stamp(actor, "created the task")],
    });
    syncProgress(d, draft.projectId);
  });
  return id;
}

export function updateTask(id: ID, patch: Partial<PlanTask>, actor: PlanActor, note?: string) {
  setDB((d) => {
    const task = d.planTasks.find((t) => t.id === id);
    if (!task) return;
    Object.assign(task, patch, { updatedAt: Date.now() });
    task.history = [...task.history, stamp(actor, note ?? "edited the task")].slice(-60);
    syncProgress(d, task.projectId);
  });
}

export function setTaskStatus(id: ID, status: PlanTask["status"], actor: PlanActor) {
  setDB((d) => {
    const task = d.planTasks.find((t) => t.id === id);
    if (!task) return;
    task.status = status;
    task.done = status === "done";
    task.updatedAt = Date.now();
    if (task.done) {
      task.completedAt = Date.now();
      task.completedBy = actor.id;
    } else {
      delete task.completedAt;
      delete task.completedBy;
    }
    task.history = [
      ...task.history,
      stamp(actor, task.done ? "completed the task" : `set status to ${status.replace("_", " ")}`),
    ].slice(-60);
    syncProgress(d, task.projectId);
  });
}

export function toggleTaskDone(id: ID, actor: PlanActor) {
  const db = currentTask(id);
  setTaskStatus(id, db?.done ? "todo" : "done", actor);
}

export function deleteTask(id: ID) {
  setDB((d) => {
    const task = d.planTasks.find((t) => t.id === id);
    d.planTasks = d.planTasks.filter((t) => t.id !== id);
    if (task) syncProgress(d, task.projectId);
  });
}

export function reassignTask(id: ID, assignees: "all" | ID[], actor: PlanActor) {
  updateTask(id, { assignees }, actor, "reassigned the task");
}

let peek: (() => DB) | null = null;
function currentTask(id: ID): PlanTask | undefined {
  if (!peek) return undefined;
  return peek().planTasks.find((t) => t.id === id);
}
/** Wired once at module init to avoid an import cycle in `toggleTaskDone`. */
export function bindStoreReader(reader: () => DB) {
  peek = reader;
}

/** Keeps a project's progress in step with its tasks unless overridden. */
function syncProgress(d: DB, projectId: ID) {
  const project = d.planProjects.find((p) => p.id === projectId);
  if (!project || !project.autoProgress) return;
  const tasks = d.planTasks.filter((t) => t.projectId === projectId);
  project.progress = tasks.length === 0 ? project.progress : Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  if (tasks.length > 0 && project.progress === 100 && project.status !== "cancelled") project.status = "done";
  project.updatedAt = Date.now();
}

/* ---------------- derived reads ---------------- */

export function projectsForMonth(db: DB, month: number) {
  return db.planProjects.filter((p) => p.month === month).sort((a, b) => a.order - b.order);
}

export function tasksForProject(db: DB, projectId: ID) {
  return db.planTasks
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
}

/** A member sees club-wide tasks, tasks assigned to them, and their own tasks. */
export function canSeeTask(task: PlanTask, user: PlanActor) {
  if (user.isAdmin) return true;
  if (task.assignees === "all") return true;
  return task.assignees.includes(user.id) || task.createdBy === user.id;
}

/** Creator, assignee or admin may edit. */
export function canEditTask(task: PlanTask, user: PlanActor) {
  if (user.isAdmin) return true;
  if (task.createdBy === user.id) return true;
  return task.assignees === "all" || task.assignees.includes(user.id);
}

export function visiblePlanTasks(db: DB, projectId: ID, user: PlanActor) {
  return tasksForProject(db, projectId).filter((t) => canSeeTask(t, user));
}

export function assigneeLabel(db: DB, task: PlanTask) {
  if (task.assignees === "all") return "Everyone";
  if (task.assignees.length === 0) return "Unassigned";
  const names = task.assignees.map((id) => {
    const u = db.users.find((x) => x.id === id);
    return u?.preferredName || u?.fullName || u?.email || "Unknown";
  });
  return names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1}`;
}
