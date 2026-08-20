import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Megaphone,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth, useDB, ONLINE_WINDOW_MS } from "@/lib/auth";
import { setSuggestionMark, visibleSuggestions, type CTA, type HomeCardId } from "@/lib/store";
import { TasksPanel } from "@/components/TasksPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dash/home")({
  head: () => ({
    meta: [
      { title: "Home — The Students Hub" },
      {
        name: "description",
        content: "Announcements, this week's meeting, tasks, funds and upcoming club events.",
      },
      { property: "og:title", content: "Home — The Students Hub" },
      {
        property: "og:description",
        content: "Announcements, meetings, tasks and upcoming club events.",
      },
    ],
  }),
  component: HomePage,
});

function CtaLink({ cta }: { cta: CTA }) {
  const external = !cta.to.startsWith("/");
  const cls =
    "press mt-3 inline-flex rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:-translate-y-0.5";
  return external ? (
    <a href={cta.to} target="_blank" rel="noreferrer noopener" className={cls}>
      {cta.label}
    </a>
  ) : (
    <Link to={cta.to} className={cls}>
      {cta.label}
    </Link>
  );
}

const cardShell =
  "surface-card mb-5 break-inside-avoid p-5 transition-shadow duration-300 hover:shadow-lift";

function HomePage() {
  const { user } = useAuth();
  const db = useDB();
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [allEvents, setAllEvents] = useState(false);
  const [dismissedLocal, setDismissedLocal] = useState<string[]>([]);
  if (!user) return null;

  const profileIncomplete = !user.avatar || !user.phone;
  const online = Object.entries(db.presence).filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS);
  const upcoming = db.events
    .filter((e) => !e.completed)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = db.events.filter((e) => e.completed);
  const shownEvents = allEvents ? upcoming : upcoming.slice(0, 3);
  const announcements = db.announcements
    .filter(
      (a) =>
        !a.archived &&
        (a.targets === undefined || a.targets === "all" || a.targets.includes(user.id)),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.ts - a.ts);
  const latestNotes = [...db.notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const defaults = [
    ...(profileIncomplete
      ? [
          {
            id: "d-profile",
            title: "Complete your profile",
            body: "Add a profile picture and phone number so the committee can reach you.",
            cta: { label: "Finish profile", to: "/account" } as CTA,
          },
        ]
      : []),
    {
      id: "d-notes",
      title: "Share an idea in the meeting notes",
      body: "The response areas are collaborative — type and everyone sees it live.",
      cta: { label: "Open notes", to: "/notes" } as CTA,
    },
    {
      id: "d-events",
      title: "Check the events you can attend",
      body: "Vote in polls and mark what you're joining.",
      cta: { label: "See events", to: "/events" } as CTA,
    },
  ].filter((d) => !dismissedLocal.includes(d.id));

  const suggestions = [...visibleSuggestions(db, user.id), ...defaults];

  const cards: Record<HomeCardId, React.ReactNode> = {
    suggestions: (
      <section className={cn(cardShell, "border-primary/20")}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-primary" /> Suggestions for you
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="group relative rounded-xl bg-secondary/50 p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary"
            >
              <p className="pr-6 text-sm font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              {s.cta && <CtaLink cta={s.cta} />}
              <div className="mt-3 flex items-center gap-2">
                <button
                  className="press inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  onClick={() =>
                    s.id.startsWith("d-")
                      ? setDismissedLocal((v) => [...v, s.id])
                      : setSuggestionMark(s.id, user.id, "completed")
                  }
                >
                  <Check className="size-3.5" /> Done
                </button>
                <button
                  className="press inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    s.id.startsWith("d-")
                      ? setDismissedLocal((v) => [...v, s.id])
                      : setSuggestionMark(s.id, user.id, "ignored")
                  }
                >
                  <X className="size-3.5" /> Ignore
                </button>
              </div>
            </li>
          ))}
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You're all caught up — nothing suggested right now.
            </p>
          )}
        </ul>
      </section>
    ),
    announcements: (
      <section
        className={cn(
          cardShell,
          "overflow-hidden border-primary/25 bg-primary-soft/40 shadow-soft",
        )}
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Megaphone className="size-4 text-primary" /> Announcements
        </h2>
        <div className="mt-4 space-y-3">
          {announcements.map((a) => (
            <article
              key={a.id}
              className="rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary"
            >
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
              {a.cta && <CtaLink cta={a.cta} />}
            </article>
          ))}
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </div>
      </section>
    ),
    funds: (
      <section className={cardShell}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="size-4 text-primary" /> {db.funds.label}
        </h2>
        <p className="mt-4 text-4xl font-semibold tracking-tight text-primary">
          {db.funds.total.toLocaleString()}
          <span className="ml-1 text-base font-medium text-muted-foreground">
            {db.funds.currency}
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{db.funds.note}</p>
      </section>
    ),
    meeting: db.meeting.visible ? (
      <section className={cardShell}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" /> This week's meeting
        </h2>
        <p className="mt-3 text-sm font-medium">{db.meeting.title}</p>
        <p className="text-sm text-muted-foreground">
          {db.meeting.date} · {db.meeting.time} · {db.meeting.room}
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {db.meeting.agenda.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
        {db.meeting.note && <p className="mt-3 text-xs text-muted-foreground">{db.meeting.note}</p>}
      </section>
    ) : null,
    tasks: (
      <section className={cardShell}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4 text-primary" /> Your tasks
        </h2>
        <div className="mt-4">
          <TasksPanel limit={3} />
        </div>
      </section>
    ),
    notes: (
      <section className={cardShell}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4 text-primary" /> Latest meeting notes
        </h2>
        <div className="mt-4 space-y-3">
          {latestNotes.map((n) => (
            <Link
              key={n.id}
              to="/notes/$id"
              params={{ id: n.id }}
              className="block rounded-xl border border-border p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <p className="text-sm font-medium">
                #{n.number} · {n.title}
              </p>
              <p className="text-xs text-muted-foreground">{n.dateLabel}</p>
            </Link>
          ))}
          {latestNotes.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes published yet.</p>
          )}
        </div>
      </section>
    ),
    events: (
      <section className={cardShell}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> Upcoming events
        </h2>
        <div className="mt-4 space-y-3">
          {shownEvents.map((e) => (
            <Link
              key={e.id}
              to="/events/$id"
              params={{ id: e.id }}
              className="block rounded-xl border border-border p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {e.dateLabel} · {e.location}
              </p>
            </Link>
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">No events scheduled.</p>
          )}
        </div>
        {upcoming.length > 3 && (
          <button
            onClick={() => setAllEvents((v) => !v)}
            className="mt-3 text-xs font-medium text-primary transition-opacity hover:opacity-70"
          >
            {allEvents ? "Show fewer" : `Show all ${upcoming.length} events`}
          </button>
        )}
        {past.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <button
              onClick={() => setShowPastEvents((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-300",
                  showPastEvents && "rotate-180",
                )}
              />
              Completed events ({past.length})
            </button>
            {showPastEvents && (
              <div className="fade-slide mt-2 space-y-2">
                {past.map((e) => (
                  <Link
                    key={e.id}
                    to="/events/$id"
                    params={{ id: e.id }}
                    className="block rounded-xl border border-border p-3 text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs">{e.dateLabel}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    ),
  };

  return (
    <div className="space-y-6">
      <header className="rise-in">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {user.fullName?.split(" ")[0] || "member"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's everything happening in the club this week.
        </p>
      </header>

      <div className="columns-1 gap-5 lg:columns-2">
        {db.homeCards
          .filter((c) => c.visible)
          .map((c) => (
            <div key={c.id} className="rise-in break-inside-avoid">
              {cards[c.id]}
            </div>
          ))}
      </div>

      {user.isAdmin && (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" /> Club at a glance
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Members", value: db.users.length },
                { label: "Online now", value: online.length },
                { label: "Notes", value: db.notes.length },
                { label: "Events", value: db.events.length },
                { label: "Open tasks", value: db.tasks.filter((t) => !t.done).length },
                { label: "Sign-ins logged", value: db.logins.length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-primary" /> Currently online
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {online.map(([id]) => {
                const u = db.users.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs"
                  >
                    <span className="size-2 animate-pulse rounded-full bg-primary" />
                    {u?.fullName || u?.email || "Unknown"}
                  </span>
                );
              })}
              {online.length === 0 && (
                <p className="text-sm text-muted-foreground">Nobody online right now.</p>
              )}
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <NotebookPen className="size-4 text-primary" /> Admin shortcuts
            </h2>
            <div className="mt-4 grid gap-2">
              {[
                { to: "/admin/announcements", label: "Post an announcement" },
                { to: "/admin/suggestions", label: "Target suggestions" },
                { to: "/admin/home", label: "Customise the home page" },
                { to: "/admin/meeting", label: "Edit the weekly meeting" },
                { to: "/admin/funds", label: "Update club funds" },
                { to: "/admin/tasks", label: "Manage tasks" },
                { to: "/admin/monitoring", label: "Review sign-in activity" },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="press rounded-xl border border-border px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
