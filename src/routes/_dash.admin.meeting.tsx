import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth, useDB } from "@/lib/auth";
import { setDB } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin/meeting")({
  head: () => ({
    meta: [
      { title: "Weekly Meeting — Admin — The Students Hub" },
      { name: "description", content: "Customise the weekly meeting card shown to members." },
      { property: "og:title", content: "Weekly Meeting — Admin" },
      { property: "og:description", content: "Edit meeting time, room, agenda and visibility." },
    ],
  }),
  component: MeetingPage,
});

function MeetingPage() {
  const { user } = useAuth();
  const db = useDB();
  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const m = db.meeting;
  const [newItem, setNewItem] = useState("");

  const update = (patch: Partial<typeof m>) => setDB((d) => Object.assign(d.meeting, patch));

  const moveItem = (idx: number, dir: -1 | 1) => {
    setDB((d) => {
      const arr = d.meeting.agenda;
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return;
      const tmp = arr[idx]!;
      arr[idx] = arr[j]!;
      arr[j] = tmp;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Weekly Meeting" description="Set the details for the weekly meeting card and its agenda." />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="surface-card rise-in space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4" /> Meeting details
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={m.title} onChange={(e) => update({ title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Input value={m.room} onChange={(e) => update({ room: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={m.date} onChange={(e) => update({ date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={m.time} onChange={(e) => update({ time: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={m.note} onChange={(e) => update({ note: e.target.value })} placeholder="Bring your laptop, etc." />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
            <div>
              <p className="text-sm font-medium">Show on home page</p>
              <p className="text-xs text-muted-foreground">Toggle whether members see this card.</p>
            </div>
            <Switch checked={m.visible} onCheckedChange={(v) => update({ visible: v })} />
          </div>

          <div className="space-y-2">
            <Label>Agenda</Label>
            <ul className="space-y-2">
              {m.agenda.map((item, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2">
                  <Input
                    value={item}
                    onChange={(e) =>
                      setDB((d) => { d.meeting.agenda[i] = e.target.value; })
                    }
                    className="flex-1"
                  />
                  <button className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30" disabled={i === 0} onClick={() => moveItem(i, -1)}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30" disabled={i === m.agenda.length - 1} onClick={() => moveItem(i, 1)}>
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDB((d) => { d.meeting.agenda = d.meeting.agenda.filter((_, x) => x !== i); })}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add agenda item" onKeyDown={(e) => e.key === "Enter" && newItem.trim() && (setDB((d) => d.meeting.agenda.push(newItem.trim())), setNewItem(""))} />
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  if (!newItem.trim()) return;
                  setDB((d) => d.meeting.agenda.push(newItem.trim()));
                  setNewItem("");
                  toast.success("Agenda item added.");
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="surface-card gradient-primary rise-in h-fit space-y-3 p-5 text-primary-foreground shadow-lift">
          <p className="text-xs uppercase tracking-wide opacity-80">Live preview</p>
          <h3 className="text-xl font-semibold">{m.title || "Weekly Meeting"}</h3>
          <p className="text-sm opacity-90">
            {m.date || "No date"} · {m.time || "No time"} · {m.room || "No room"}
          </p>
          {m.note && <p className="text-sm opacity-90">{m.note}</p>}
          <ul className="space-y-1 text-sm opacity-90">
            {m.agenda.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
          {!m.visible && <p className="text-xs opacity-75">(Hidden from members)</p>}
        </section>
      </div>
    </div>
  );
}
