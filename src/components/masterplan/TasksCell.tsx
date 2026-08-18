import { useState } from "react";
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDB } from "@/lib/auth";
import { TaskDialog } from "@/components/masterplan/TaskDialog";
import {
  assigneeLabel,
  canEditTask,
  deleteTask,
  toggleTaskDone,
  visiblePlanTasks,
  type PlanActor,
} from "@/lib/masterplan";
import { PLAN_TASK_STATUS_LABELS, type ID, type PlanTask } from "@/lib/store";

interface Props {
  projectId: ID;
  actor: PlanActor;
}

export function TasksCell({ projectId, actor }: Props) {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const tasks = visiblePlanTasks(db, projectId, actor);
  const done = tasks.filter((t) => t.done).length;

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="press inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
            <CheckCircle2 className="size-3.5 text-muted-foreground" />
            {tasks.length === 0 ? "No tasks" : `${done}/${tasks.length} done`}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Tasks</p>
            <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs" onClick={openNew}>
              <Plus className="mr-1 size-3.5" /> New
            </Button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {tasks.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">
                No tasks yet. Anyone in the club can add the first one.
              </p>
            )}
            {tasks.map((t) => {
              const editable = canEditTask(t, actor);
              return (
                <div key={t.id} className="group rounded-lg p-2 transition-colors hover:bg-secondary">
                  <div className="flex items-start gap-2">
                    <button
                      className="mt-0.5 text-muted-foreground transition-colors hover:text-primary"
                      title={t.done ? "Mark as not done" : "Mark as done"}
                      onClick={() => editable && toggleTaskDone(t.id, actor)}
                      disabled={!editable}
                    >
                      {t.done ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : (
                        <Circle className="size-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>
                        {t.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {assigneeLabel(db, t)} · {PLAN_TASK_STATUS_LABELS[t.status]}
                        {t.due ? ` · due ${t.due}` : ""}
                      </p>
                    </div>
                    {editable && (
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          title="Edit task"
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        actor={actor}
        projectId={projectId}
        task={editing}
      />
    </>
  );
}
