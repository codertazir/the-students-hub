import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckSquare, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth, useDB } from "@/lib/auth";
import { setDB, uid } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin/funds")({
  head: () => ({
    meta: [
      { title: "Club Funds — Admin — The Students Hub" },
      { name: "description", content: "Edit the club funds card and manage member tasks." },
      { property: "og:title", content: "Club Funds — Admin" },
      { property: "og:description", content: "Update the funds total and assign tasks to members." },
    ],
  }),
  component: FundsPage,
});

function FundsPage() {
  const { user } = useAuth();
  const db = useDB();
  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const f = db.funds;
  const update = (patch: Partial<typeof f>) => setDB((d) => Object.assign(d.funds, patch, { updatedAt: Date.now() }));

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [assignee, setAssignee] = useState("all");

  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(f.total || 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Club Funds" description="Update the funds card members see, and keep an eye on club tasks." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card rise-in space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PiggyBank className="size-4" /> Funds details
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={f.label} onChange={(e) => update({ label: e.target.value })} placeholder="Club Funds" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={f.currency} onChange={(e) => update({ currency: e.target.value })} placeholder="USD" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Total amount</Label>
              <Input
                type="number"
                value={f.total}
                onChange={(e) => update({ total: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Note</Label>
              <Input value={f.note} onChange={(e) => update({ note: e.target.value })} placeholder="Reserved for spring trip" />
            </div>
          </div>
        </section>

        <section className="surface-card gradient-primary rise-in flex h-fit flex-col items-center justify-center gap-1 p-8 text-center text-primary-foreground shadow-lift">
          <p className="text-xs uppercase tracking-wide opacity-80">{f.label || "Club Funds"}</p>
          <p className="text-4xl font-bold tabular-nums sm:text-5xl">
            {f.currency} {formatted}
          </p>
          {f.note && <p className="mt-2 text-sm opacity-90">{f.note}</p>}
          <p className="mt-3 text-xs opacity-70">Updated {new Date(f.updatedAt).toLocaleString()}</p>
        </section>
      </div>

      <section className="surface-card rise-in space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CheckSquare className="size-4" /> Tasks ({db.tasks.length})
        </h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
          <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="w-40" />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="all">Everyone</option>
            {db.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.email}
              </option>
            ))}
          </select>
          <Button
            className="rounded-full"
            disabled={!taskTitle.trim()}
            onClick={() => {
              setDB((d) =>
                d.tasks.unshift({
                  id: uid(),
                  title: taskTitle.trim(),
                  due: taskDue,
                  done: false,
                  createdBy: "system",
                  assignedTo: assignee,
                  createdAt: Date.now(),
                }),
              );
              setTaskTitle("");
              setTaskDue("");
              setAssignee("all");
              toast.success("Task created.");
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>

        <ul className="space-y-2">
          {db.tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm">
              <span className={t.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.due || "No due date"}</span>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-accent-foreground">
                {t.assignedTo === "all" ? "Everyone" : db.users.find((u) => u.id === t.assignedTo)?.fullName || "Member"}
              </span>
              <button
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDB((d) => { d.tasks = d.tasks.filter((x) => x.id !== t.id); })}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {db.tasks.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No tasks yet.</p>}
        </ul>
      </section>
    </div>
  );
}
