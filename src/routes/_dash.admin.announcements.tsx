import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Bell, Megaphone, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth, useDB } from "@/lib/auth";
import { setDB, uid, userLabel } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Admin — The Students Hub" },
      { name: "description", content: "Compose and manage club announcements and notifications." },
      { property: "og:title", content: "Announcements — Admin" },
      { property: "og:description", content: "Create, pin and remove announcements and notifications." },
    ],
  }),
  component: AnnouncementsPage,
});

type Delivery = "announcement" | "notification" | "both";

function AnnouncementsPage() {
  const { user } = useAuth();
  const db = useDB();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaTo, setCtaTo] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("announcement");
  const [targetMode, setTargetMode] = useState<"all" | "some">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const cta = useMemo(() => (ctaLabel.trim() && ctaTo.trim() ? { label: ctaLabel.trim(), to: ctaTo.trim() } : undefined), [ctaLabel, ctaTo]);

  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const reset = () => {
    setTitle("");
    setBody("");
    setCtaLabel("");
    setCtaTo("");
    setTargetMode("all");
    setSelected([]);
    setEditingId(null);
  };

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    const targets: "all" | string[] = targetMode === "all" ? "all" : selected;

    if (editingId) {
      setDB((d) => {
        const a = d.announcements.find((x) => x.id === editingId);
        if (a) {
          a.title = title.trim();
          a.body = body.trim();
          if (cta) a.cta = cta;
          else delete a.cta;
        }
      });
      toast.success("Announcement updated.");
      reset();
      return;
    }

    if (delivery === "announcement" || delivery === "both") {
      setDB((d) => {
        d.announcements.unshift({
          id: uid(),
          title: title.trim(),
          body: body.trim(),
          ts: Date.now(),
          pinned: true,
          archived: false,
          channel: delivery,
          targets,
          ...(cta ? { cta } : {}),
        });
      });
    }
    if (delivery === "notification" || delivery === "both") {
      setDB((d) => {
        d.notifications.unshift({
          id: uid(),
          title: title.trim(),
          body: body.trim(),
          ts: Date.now(),
          read: false,
          targets,
          ...(cta ? { cta } : {}),
        });
        d.notifications = d.notifications.slice(0, 80);
      });
    }
    toast.success("Sent successfully.");
    reset();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Compose announcements and notifications, and manage what's already been sent." />

      <section className="surface-card rise-in space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Megaphone className="size-4" /> {editingId ? "Edit announcement" : "New message"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bake sale this Friday" />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details for members" />
          </div>
          <div className="space-y-1.5">
            <Label>CTA label (optional)</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View details" />
          </div>
          <div className="space-y-1.5">
            <Label>CTA link (optional)</Label>
            <Input value={ctaTo} onChange={(e) => setCtaTo(e.target.value)} placeholder="/events or https://..." />
          </div>
        </div>

        {!editingId && (
          <div className="space-y-2">
            <Label>Deliver as</Label>
            <RadioGroup value={delivery} onValueChange={(v) => setDelivery(v as Delivery)} className="flex flex-wrap gap-4">
              {(["announcement", "notification", "both"] as const).map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <RadioGroupItem value={v} id={`d-${v}`} />
                  <Label htmlFor={`d-${v}`} className="capitalize font-normal">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {!editingId && delivery !== "announcement" && (
          <div className="space-y-2">
            <Label>Notify</Label>
            <RadioGroup value={targetMode} onValueChange={(v) => setTargetMode(v as "all" | "some")} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="t-all" />
                <Label htmlFor="t-all" className="font-normal">Everyone</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="some" id="t-some" />
                <Label htmlFor="t-some" className="font-normal">Specific members</Label>
              </div>
            </RadioGroup>
            {targetMode === "some" && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {db.users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/60">
                    <Checkbox
                      checked={selected.includes(u.id)}
                      onCheckedChange={(c) =>
                        setSelected((s) => (c ? [...s, u.id] : s.filter((id) => id !== u.id)))
                      }
                    />
                    {u.fullName || u.email}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={submit} disabled={!title.trim() || !body.trim()} className="rounded-full">
            <Send className="size-4" /> {editingId ? "Save changes" : "Send"}
          </Button>
          {editingId && (
            <Button variant="outline" className="rounded-full" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </section>

      {([false, true] as const).map((archivedView) => {
        const list = [...db.announcements].filter((a) => !!a.archived === archivedView).sort((a, b) => b.ts - a.ts);
        if (archivedView && list.length === 0) return null;
        return (
          <section key={String(archivedView)} className="surface-card rise-in space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {archivedView ? <Archive className="size-4" /> : <Pin className="size-4" />}
              {archivedView ? "Archived" : "Live on the home page"} ({list.length})
            </h2>
            <ul className="space-y-2">
              {list.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3 transition-colors hover:bg-secondary/70">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(a.ts).toLocaleString()}
                      {a.targets && a.targets !== "all"
                        ? ` · ${a.targets.map((id) => userLabel(db, id)).join(", ") || "No one"}`
                        : " · Everyone"}
                    </p>
                  </div>
                  {!archivedView && (
                    <button
                      title={a.pinned ? "Unpin" : "Pin"}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      onClick={() => setDB((d) => { const t = d.announcements.find((x) => x.id === a.id); if (t) t.pinned = !t.pinned; })}
                    >
                      {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    </button>
                  )}
                  <button
                    title={archivedView ? "Restore to home page" : "Archive (keeps the history)"}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    onClick={() => {
                      setDB((d) => { const t = d.announcements.find((x) => x.id === a.id); if (t) t.archived = !archivedView; });
                      toast.success(archivedView ? "Announcement restored." : "Announcement archived.");
                    }}
                  >
                    {archivedView ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                  </button>
                  <button
                    className="rounded-full px-2 py-1 text-xs text-primary hover:underline"
                    onClick={() => {
                      setEditingId(a.id);
                      setTitle(a.title);
                      setBody(a.body);
                      setCtaLabel(a.cta?.label ?? "");
                      setCtaTo(a.cta?.to ?? "");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    title="Delete permanently"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (!window.confirm(`Delete "${a.title}" permanently?`)) return;
                      setDB((d) => { d.announcements = d.announcements.filter((x) => x.id !== a.id); });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
              {list.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No announcements yet.</p>}
            </ul>
          </section>
        );
      })}

      <section className="surface-card rise-in space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4" /> Recent notifications ({db.notifications.length})
        </h2>
        <ul className="space-y-2">
          {[...db.notifications].sort((a, b) => b.ts - a.ts).slice(0, 30).map((n) => (
            <li key={n.id} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{n.title}</p>
                <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.ts).toLocaleString()} · {n.targets === "all" ? "Everyone" : n.targets.map((id) => userLabel(db, id)).join(", ") || "No one"}
                </p>
              </div>
              <button
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDB((d) => { d.notifications = d.notifications.filter((x) => x.id !== n.id); })}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {db.notifications.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No notifications sent yet.</p>}
        </ul>
      </section>
    </div>
  );
}
