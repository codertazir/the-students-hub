import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDB } from "@/lib/auth";
import { createProject, updateProject, type PlanActor, type ProjectDraft } from "@/lib/masterplan";
import {
  MONTH_NAMES,
  PLAN_PRIORITIES,
  PLAN_PRIORITY_LABELS,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  type PlanProject,
} from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: PlanActor;
  /** Editing an existing row, or null when creating a new one. */
  project?: PlanProject | null;
  defaultMonth: number;
}

const emptyDraft = (month: number): ProjectDraft => ({
  month,
  name: "",
  description: "",
  status: "planned",
  priority: "medium",
  progress: 0,
  autoProgress: true,
  eventId: null,
  start: "",
  end: "",
  owner: "",
});

const select =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30";

export function ProjectDialog({ open, onOpenChange, actor, project, defaultMonth }: Props) {
  const db = useDB();
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft(defaultMonth));

  useEffect(() => {
    if (!open) return;
    setDraft(
      project
        ? {
            month: project.month,
            name: project.name,
            description: project.description,
            status: project.status,
            priority: project.priority,
            progress: project.progress,
            autoProgress: project.autoProgress,
            eventId: project.eventId ?? null,
            start: project.start,
            end: project.end,
            owner: project.owner ?? "",
          }
        : emptyDraft(defaultMonth),
    );
  }, [open, project, defaultMonth]);

  const patch = (p: Partial<ProjectDraft>) => setDraft((d) => ({ ...d, ...p }));

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Give the project a name first.");
      return;
    }
    const clean: ProjectDraft = { ...draft, name: draft.name.trim() };
    if (project) {
      updateProject(project.id, clean);
      toast.success("Project updated.");
    } else {
      createProject(clean, actor);
      toast.success("Project added to the master plan.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project / event" : "New project / event"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Winter Showcase" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What is this project about?"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Month</Label>
            <select className={select} value={draft.month} onChange={(e) => patch({ month: Number(e.target.value) })}>
              {db.planMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Owner</Label>
            <Input value={draft.owner ?? ""} onChange={(e) => patch({ owner: e.target.value })} placeholder="Media team" />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              className={select}
              value={draft.status}
              onChange={(e) => patch({ status: e.target.value as ProjectDraft["status"] })}
            >
              {PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAN_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <select
              className={select}
              value={draft.priority}
              onChange={(e) => patch({ priority: e.target.value as ProjectDraft["priority"] })}
            >
              {PLAN_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PLAN_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={draft.start} onChange={(e) => patch({ start: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>End date (optional)</Label>
            <Input type="date" value={draft.end} onChange={(e) => patch({ end: e.target.value })} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Linked event page</Label>
            <select
              className={select}
              value={draft.eventId ?? ""}
              onChange={(e) => patch({ eventId: e.target.value || null })}
            >
              <option value="">No event page yet</option>
              {db.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  #{ev.number} · {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Progress from tasks</p>
              <p className="text-xs text-muted-foreground">
                Keep progress in step with completed tasks, or set it manually.
              </p>
            </div>
            <Switch checked={draft.autoProgress} onCheckedChange={(v) => patch({ autoProgress: v })} />
          </div>

          {!draft.autoProgress && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Progress ({draft.progress}%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.progress}
                onChange={(e) => patch({ progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={save}>
            {project ? "Save changes" : "Add project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
