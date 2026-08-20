import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDB } from "@/lib/auth";
import { createTask, updateTask, type PlanActor } from "@/lib/masterplan";
import {
  PLAN_PRIORITIES,
  PLAN_PRIORITY_LABELS,
  PLAN_TASK_STATUSES,
  PLAN_TASK_STATUS_LABELS,
  type ID,
  type PlanTask,
} from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: PlanActor;
  projectId: ID;
  task?: PlanTask | null;
}

type Mode = "me" | "all" | "specific";

const select =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30";

export function TaskDialog({ open, onOpenChange, actor, projectId, task }: Props) {
  const db = useDB();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<PlanTask["priority"]>("medium");
  const [status, setStatus] = useState<PlanTask["status"]>("todo");
  const [mode, setMode] = useState<Mode>("me");
  const [picked, setPicked] = useState<ID[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDue(task?.due ?? "");
    setPriority(task?.priority ?? "medium");
    setStatus(task?.status ?? "todo");
    if (!task) {
      setMode("me");
      setPicked([actor.id]);
      return;
    }
    if (task.assignees === "all") {
      setMode("all");
      setPicked([]);
    } else if (task.assignees.length === 1 && task.assignees[0] === actor.id) {
      setMode("me");
      setPicked([actor.id]);
    } else {
      setMode("specific");
      setPicked([...task.assignees]);
    }
  }, [open, task, actor.id]);

  const assignees: "all" | ID[] = mode === "all" ? "all" : mode === "me" ? [actor.id] : picked;

  const save = () => {
    if (!title.trim()) {
      toast.error("Give the task a title first.");
      return;
    }
    if (mode === "specific" && picked.length === 0) {
      toast.error("Pick at least one member to assign this task to.");
      return;
    }
    const payload = { title: title.trim(), description, due, priority, status, assignees };
    if (task) {
      updateTask(task.id, payload, actor);
      toast.success("Task updated.");
    } else {
      createTask({ projectId, ...payload }, actor);
      toast.success("Task created.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Design the poster"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <select
              className={select}
              value={priority}
              onChange={(e) => setPriority(e.target.value as PlanTask["priority"])}
            >
              {PLAN_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PLAN_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status</Label>
            <select
              className={select}
              value={status}
              onChange={(e) => setStatus(e.target.value as PlanTask["status"])}
            >
              {PLAN_TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAN_TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Assign to</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["me", "Myself"],
                  ["specific", "Specific members"],
                  ["all", "Everyone"],
                ] as [Mode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={
                    mode === value
                      ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-soft"
                      : "rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === "specific" && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {db.users.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">No members yet.</p>
                )}
                {db.users.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-secondary"
                  >
                    <Checkbox
                      checked={picked.includes(u.id)}
                      onCheckedChange={(v) =>
                        setPicked((cur) =>
                          v ? [...new Set([...cur, u.id])] : cur.filter((x) => x !== u.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{u.fullName || u.email}</span>
                    <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={save}>
            {task ? "Save task" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
