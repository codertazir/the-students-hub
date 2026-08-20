import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/track";
import { useAuth, useDB } from "@/lib/auth";
import { previewAccent, setDB, uid } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dash/events")({
  head: () => ({
    meta: [
      { title: "Events — The Students Hub" },
      {
        name: "description",
        content: "Browse upcoming and past club events, polls, budgets and shared files.",
      },
      { property: "og:title", content: "Events — The Students Hub" },
      {
        property: "og:description",
        content: "Browse upcoming and past club events, polls, budgets and shared files.",
      },
    ],
  }),
  component: EventsPage,
});

const EMOJIS = ["🎉", "🎭", "📚", "🎤", "🚀", "🏆", "🎨", "🎶"];

function EventsPage() {
  const { user } = useAuth();
  const db = useDB();
  const navigate = useNavigate();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  if (!user) return null;

  const upcoming = db.events
    .filter((e) => !e.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completed = db.events
    .filter((e) => e.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const createEvent = () => {
    const nextNumber = db.events.reduce((m, e) => Math.max(m, e.number), 0) + 1;
    const id = uid();
    const now = new Date();
    setDB((d) => {
      d.events.unshift({
        id,
        number: nextNumber,
        title: "New event",
        dateLabel: `${now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`,
        date: now.toISOString().slice(0, 10),
        location: "TBC",
        previewEmoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!,
        previewAccent: previewAccent(Math.floor(Math.random() * 6)),
        completed: false,
        createdAt: Date.now(),
        blocks: [{ id: uid(), kind: "text", content: "Add the details for this event." }],
        cards: [
          {
            id: uid(),
            type: "info",
            title: "About this event",
            visible: true,
            info: { body: "Share the plan here." },
          },
        ],
        comments: [],
      });
    });
    void navigate({ to: "/events/$id", params: { id } });
  };

  const deleteEvent = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDB((d) => {
      d.events = d.events.filter((e) => e.id !== id);
    });
    setMenuFor(null);
    track("events", `deleted the event "${title}"`, null, { eventId: id });
    toast.success("Event deleted");
  };

  const toggleCompleted = (id: string) => {
    setDB((d) => {
      const ev = d.events.find((e) => e.id === id);
      if (ev) {
        ev.completed = !ev.completed;
        track(
          "events",
          `marked the event "${ev.title}" as ${ev.completed ? "completed" : "upcoming"}`,
          null,
          { eventId: id },
        );
      }
    });
    setMenuFor(null);
  };

  const grid = (list: typeof db.events) => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((e) => (
        <div key={e.id} className="group relative">
          <Link
            to="/events/$id"
            params={{ id: e.id }}
            className="surface-card block overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <div
              className="flex aspect-[4/3] items-center justify-center text-6xl"
              style={{
                background: `linear-gradient(135deg, ${e.previewAccent}33, ${e.previewAccent}0d)`,
              }}
            >
              <span>{e.previewEmoji}</span>
            </div>
            <div className="space-y-1 p-4">
              <p className="line-clamp-1 text-sm font-semibold leading-snug">
                {e.title} <span className="text-muted-foreground">#{e.number}</span>
              </p>
              <p className="text-xs text-muted-foreground">{e.dateLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{e.location}</p>
            </div>
          </Link>
          {user.isAdmin && (
            <div className="absolute right-2 top-2">
              <button
                onClick={(ev) => {
                  ev.preventDefault();
                  setMenuFor(menuFor === e.id ? null : e.id);
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-200 group-hover:opacity-100",
                  menuFor === e.id && "opacity-100",
                )}
              >
                <MoreVertical className="size-4" />
              </button>
              {menuFor === e.id && (
                <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-border bg-card p-1 shadow-lift">
                  <button
                    onClick={(ev) => {
                      ev.preventDefault();
                      toggleCompleted(e.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    Mark {e.completed ? "upcoming" : "completed"}
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.preventDefault();
                      deleteEvent(e.id, e.title);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-secondary"
                  >
                    <Trash2 className="size-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything happening in the club — polls, budgets, files and discussion.
          </p>
        </div>
        {user.isAdmin && (
          <button
            onClick={createEvent}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lift transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> New event
          </button>
        )}
      </header>

      {db.events.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center gap-2 rounded-2xl border border-border p-16 text-center">
          <p className="text-4xl">🎪</p>
          <p className="text-sm font-medium">No events yet</p>
          <p className="text-xs text-muted-foreground">
            {user.isAdmin
              ? "Create the first event to get started."
              : "Check back soon for upcoming events."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 ? (
            grid(upcoming)
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events right now.</p>
          )}

          {completed.length > 0 && (
            <div className="border-t border-border pt-5">
              <button
                onClick={() => setShowCompleted((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-300",
                    showCompleted && "rotate-180",
                  )}
                />
                Completed events ({completed.length})
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  showCompleted ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">{grid(completed)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
