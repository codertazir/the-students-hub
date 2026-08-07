import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, FolderOpen, Lock, MessageCircleQuestion, Plus, Rows3, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth, useDB } from "@/lib/auth";
import { logActivity, setDB, uid } from "@/lib/store";

export const Route = createFileRoute("/_dash/events")({
  head: () => ({
    meta: [
      { title: "Events — The Students Hub" },
      { name: "description", content: "Club events with notes, polls, questions, comments and shared media folders." },
      { property: "og:title", content: "Events — The Students Hub" },
      { property: "og:description", content: "Club events with polls, questions and shared media folders." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { user } = useAuth();
  const db = useDB();
  const [split, setSplit] = useState(false);
  const [openId, setOpenId] = useState<string | null>(db.events[0]?.id ?? null);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Notes, polls, questions and media for every club event.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setSplit((s) => !s)}>
            {split ? <Rows3 className="size-4" /> : <CalendarDays className="size-4" />}
            {split ? "List view" : "Split with calendar"}
          </Button>
          {user.isAdmin && (
            <Button
              className="rounded-full"
              onClick={() =>
                setDB((d) =>
                  d.events.unshift({
                    id: uid(),
                    title: "New event",
                    date: new Date().toISOString().slice(0, 10),
                    location: "TBC",
                    notes: "Add the details for this event.",
                    comments: [],
                    folders: [],
                  }),
                )
              }
            >
              <Plus className="size-4" /> New event
            </Button>
          )}
        </div>
      </header>

      <div className={cn("gap-5", split ? "grid lg:grid-cols-[1.4fr_1fr]" : "block")}>
        <div className="space-y-4">
          {db.events.map((e) => (
            <article key={e.id} className="surface-card overflow-hidden">
              <button
                onClick={() => setOpenId(openId === e.id ? null : e.id)}
                className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-secondary/40"
              >
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
                  <span className="text-xs uppercase">{new Date(e.date).toLocaleString("en", { month: "short" })}</span>
                  <span className="text-sm font-semibold">{new Date(e.date).getDate()}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.date} · {e.location}
                  </span>
                </span>
              </button>

              {openId === e.id && (
                <div className="rise-in space-y-5 border-t border-border p-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">{e.notes}</p>

                  {e.poll && (
                    <div>
                      <h3 className="text-sm font-semibold">{e.poll.question}</h3>
                      <div className="mt-3 space-y-2">
                        {e.poll.options.map((o) => {
                          const total = e.poll!.options.reduce((s, x) => s + x.votes.length, 0) || 1;
                          const pct = Math.round((o.votes.length / total) * 100);
                          const mine = o.votes.includes(user.id);
                          return (
                            <button
                              key={o.id}
                              onClick={() =>
                                setDB((d) => {
                                  const ev = d.events.find((x) => x.id === e.id);
                                  ev?.poll?.options.forEach((opt) => {
                                    opt.votes = opt.votes.filter((v) => v !== user.id);
                                    if (opt.id === o.id) opt.votes.push(user.id);
                                  });
                                })
                              }
                              className={cn(
                                "relative w-full overflow-hidden rounded-xl border border-border px-4 py-2.5 text-left text-sm transition-colors",
                                mine ? "border-primary/50 bg-primary-soft" : "hover:bg-secondary",
                              )}
                            >
                              <span
                                className="absolute inset-y-0 left-0 bg-primary/12 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative flex justify-between">
                                <span>{o.label}</span>
                                <span className="text-muted-foreground">{o.votes.length} votes</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <FolderOpen className="size-4 text-primary" /> Media folders
                    </h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {e.folders.map((f) => (
                        <div key={f.id} className="rounded-xl border border-border p-3">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {f.name}
                            {!f.uploadsAllowed && <Lock className="size-3.5 text-muted-foreground" />}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {f.files.length} file(s) ·{" "}
                            {f.uploadsAllowed ? "uploads open to members" : "admin uploads only"}
                          </p>
                          {(f.uploadsAllowed || user.isAdmin) && (
                            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary hover:underline">
                              <Upload className="size-3.5" /> Upload
                              <input
                                type="file"
                                className="hidden"
                                onChange={(ev) => {
                                  const file = ev.target.files?.[0];
                                  if (!file) return;
                                  setDB((d) => {
                                    const folder = d.events
                                      .find((x) => x.id === e.id)
                                      ?.folders.find((x) => x.id === f.id);
                                    folder?.files.push({
                                      id: uid(),
                                      name: file.name,
                                      by: user.fullName || user.email,
                                    });
                                  });
                                  logActivity(user, "events", `Uploaded ${file.name} to ${f.name}`);
                                  toast.success("File added to the folder.");
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ))}
                      {user.isAdmin && (
                        <button
                          onClick={() => {
                            const name = window.prompt("Folder name");
                            if (!name) return;
                            setDB((d) => {
                              d.events
                                .find((x) => x.id === e.id)
                                ?.folders.push({ id: uid(), name, uploadsAllowed: true, files: [] });
                            });
                          }}
                          className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
                        >
                          + Add folder
                        </button>
                      )}
                    </div>
                  </div>

                  <Discussion eventId={e.id} />
                </div>
              )}
            </article>
          ))}
        </div>

        {split && (
          <aside className="surface-card rise-in h-fit p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4 text-primary" /> Calendar
            </h2>
            <MiniCalendar dates={db.events.map((e) => e.date)} />
            <div className="mt-4 space-y-2">
              {db.events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setOpenId(e.id)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <span className="font-medium">{new Date(e.date).getDate()}</span>{" "}
                  <span className="text-muted-foreground">{e.title}</span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function MiniCalendar({ dates }: { dates: string[] }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const marked = new Set(
    dates
      .map((d) => new Date(d))
      .filter((d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
      .map((d) => d.getDate()),
  );

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted-foreground">
        {now.toLocaleString("en", { month: "long", year: "numeric" })}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="py-1 text-muted-foreground">
            {d}
          </span>
        ))}
        {Array.from({ length: first.getDay() }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          return (
            <span
              key={day}
              className={cn(
                "rounded-lg py-1.5 transition-colors",
                marked.has(day) && "bg-primary text-primary-foreground",
                day === now.getDate() && !marked.has(day) && "bg-primary-soft text-accent-foreground",
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Discussion({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const db = useDB();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"comment" | "question">("comment");
  const event = db.events.find((e) => e.id === eventId);
  if (!user || !event) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircleQuestion className="size-4 text-primary" /> Comments, questions & suggestions
      </h3>
      <div className="mt-3 space-y-2">
        {event.comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-secondary/50 p-3 text-sm">
            <p className="text-xs font-medium text-accent-foreground">
              {c.authorName} · {c.kind === "question" ? "Question" : "Comment"}
            </p>
            <p className="mt-1">{c.text}</p>
          </div>
        ))}
        {event.comments.length === 0 && <p className="text-sm text-muted-foreground">Be the first to post.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={kind === "question" ? "Ask a question…" : "Share a comment or suggestion…"}
          className="min-w-48 flex-1 rounded-full"
        />
        <Button variant="outline" className="rounded-full" onClick={() => setKind(kind === "comment" ? "question" : "comment")}>
          {kind === "comment" ? "Comment" : "Question"}
        </Button>
        <Button
          className="rounded-full"
          disabled={!text.trim()}
          onClick={() => {
            setDB((d) => {
              d.events
                .find((e) => e.id === eventId)
                ?.comments.push({
                  id: uid(),
                  userId: user.id,
                  authorName: user.fullName || user.email,
                  text: text.trim(),
                  kind,
                  ts: Date.now(),
                });
            });
            logActivity(user, "events", `Posted a ${kind} on ${event.title}`);
            setText("");
          }}
        >
          Post
        </Button>
      </div>
    </div>
  );
}