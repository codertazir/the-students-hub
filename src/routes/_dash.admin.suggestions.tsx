import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lightbulb, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth, useDB } from "@/lib/auth";
import { setDB, suggestionStats, uid, userLabel, type Suggestion } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin/suggestions")({
  head: () => ({
    meta: [
      { title: "Suggestions — Admin — The Students Hub" },
      { name: "description", content: "Create and target suggestion cards shown on member home pages." },
      { property: "og:title", content: "Suggestions — Admin" },
      { property: "og:description", content: "Manage suggestion cards and their targeting." },
    ],
  }),
  component: SuggestionsPage,
});

function SuggestionsPage() {
  const { user } = useAuth();
  const db = useDB();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaTo, setCtaTo] = useState("");
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
    const targets: Suggestion["targets"] = targetMode === "all" ? "all" : selected;

    if (editingId) {
      setDB((d) => {
        const s = d.suggestions.find((x) => x.id === editingId);
        if (s) {
          s.title = title.trim();
          s.body = body.trim();
          s.targets = targets;
          if (cta) s.cta = cta;
          else delete s.cta;
        }
      });
      toast.success("Suggestion updated.");
    } else {
      setDB((d) => {
        d.suggestions.unshift({ id: uid(), title: title.trim(), body: body.trim(), targets, ts: Date.now(), ...(cta ? { cta } : {}) });
      });
      toast.success("Suggestion created.");
    }
    reset();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suggestions" description="Create suggestion cards for member home pages, targeted to everyone or specific people." />

      <section className="surface-card rise-in space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4" /> {editingId ? "Edit suggestion" : "New suggestion"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Join the design team" />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Short description" />
          </div>
          <div className="space-y-1.5">
            <Label>CTA label (optional)</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Learn more" />
          </div>
          <div className="space-y-1.5">
            <Label>CTA link (optional)</Label>
            <Input value={ctaTo} onChange={(e) => setCtaTo(e.target.value)} placeholder="/events or https://..." />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target</Label>
          <RadioGroup value={targetMode} onValueChange={(v) => setTargetMode(v as "all" | "some")} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="s-all" />
              <Label htmlFor="s-all" className="font-normal">Everyone</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="some" id="s-some" />
              <Label htmlFor="s-some" className="font-normal">Specific members</Label>
            </div>
          </RadioGroup>
          {targetMode === "some" && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {db.users.map((u) => (
                <label key={u.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/60">
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.includes(u.id)}
                      onCheckedChange={(c) => setSelected((s) => (c ? [...s, u.id] : s.filter((id) => id !== u.id)))}
                    />
                    {u.fullName || "Unnamed"}
                  </span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={!title.trim() || !body.trim()} className="rounded-full">
            {editingId ? "Save changes" : "Create suggestion"}
          </Button>
          {editingId && (
            <Button variant="outline" className="rounded-full" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </section>

      <section className="surface-card rise-in space-y-3 p-5">
        <h2 className="text-sm font-semibold">Existing suggestions ({db.suggestions.length})</h2>
        <ul className="space-y-2">
          {[...db.suggestions].sort((a, b) => b.ts - a.ts).map((s) => (
            <li key={s.id} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.title}</p>
                <p className="truncate text-sm text-muted-foreground">{s.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Targets: {s.targets === "all" ? "Everyone" : s.targets.map((id) => userLabel(db, id)).join(", ") || "No one"}
                </p>
                {(() => {
                  const st = suggestionStats(db, s);
                  return (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {st.audience.length} received · {st.completed.length} marked done · {st.ignored.length} ignored ·{" "}
                      {st.pending.length} no response yet
                    </p>
                  );
                })()}
                <button
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    setDB((d) => {
                      delete d.suggestionState[s.id];
                    });
                    toast.success("Reset — this suggestion shows again for everyone.");
                  }}
                >
                  Reset responses
                </button>
              </div>
              <button
                className="rounded-full px-2 py-1 text-xs text-primary hover:underline"
                onClick={() => {
                  setEditingId(s.id);
                  setTitle(s.title);
                  setBody(s.body);
                  setCtaLabel(s.cta?.label ?? "");
                  setCtaTo(s.cta?.to ?? "");
                  setTargetMode(s.targets === "all" ? "all" : "some");
                  setSelected(s.targets === "all" ? [] : s.targets);
                }}
              >
                Edit
              </button>
              <button
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDB((d) => { d.suggestions = d.suggestions.filter((x) => x.id !== s.id); })}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {db.suggestions.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No suggestions yet.</p>}
        </ul>
      </section>
    </div>
  );
}
