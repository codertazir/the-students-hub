import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Circle, Lightbulb, Pin, Sparkles, UserCircle } from "lucide-react";
import { useAuth, useDB, ONLINE_WINDOW_MS } from "@/lib/auth";
import { setDB } from "@/lib/store";

export const Route = createFileRoute("/_dash/home")({
  head: () => ({
    meta: [
      { title: "Home — The Students Hub" },
      { name: "description", content: "Announcements, this week's meeting, tasks and upcoming club events." },
      { property: "og:title", content: "Home — The Students Hub" },
      { property: "og:description", content: "Announcements, meetings, tasks and upcoming club events." },
    ],
  }),
  component: HomePage,
});

const suggestions = [
  "Share one idea for the winter showcase in the meeting notes.",
  "Invite a friend who might want to join the club.",
  "Check the events calendar and mark what you can attend.",
];

function HomePage() {
  const { user } = useAuth();
  const db = useDB();
  if (!user) return null;

  const pinned = db.announcements.filter((a) => a.pinned);
  const profileIncomplete = !user.avatar || !user.phone;
  const online = Object.entries(db.presence).filter(([, ts]) => Date.now() - ts < ONLINE_WINDOW_MS);

  return (
    <div className="space-y-6">
      <header className="rise-in">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {user.fullName?.split(" ")[0] || "member"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's everything happening in the club this week.</p>
      </header>

      {profileIncomplete && (
        <div className="surface-card flex flex-wrap items-center gap-4 border-primary/30 bg-primary-soft p-5">
          <UserCircle className="size-6 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Complete your profile</p>
            <p className="text-sm text-muted-foreground">
              Add a profile picture and phone number so the committee can reach you.
            </p>
          </div>
          <Link
            to="/account"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Finish profile
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="surface-card p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Pin className="size-4 text-primary" /> Pinned announcements
          </h2>
          <div className="mt-4 space-y-3">
            {pinned.map((a) => (
              <article key={a.id} className="rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
              </article>
            ))}
            {pinned.length === 0 && <p className="text-sm text-muted-foreground">No announcements pinned.</p>}
          </div>
        </section>

        <section className="surface-card p-5">
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
        </section>

        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 text-primary" /> Your tasks
          </h2>
          <ul className="mt-4 space-y-2">
            {db.tasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() =>
                    setDB((d) => {
                      const task = d.tasks.find((x) => x.id === t.id);
                      if (task) task.done = !task.done;
                    })
                  }
                  className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  {t.done ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={t.done ? "text-muted-foreground line-through" : ""}>
                    {t.title}
                    <span className="block text-xs text-muted-foreground">Due {t.due}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> Upcoming events
          </h2>
          <div className="mt-4 space-y-3">
            {db.events.slice(0, 3).map((e) => (
              <Link
                key={e.id}
                to="/events"
                className="block rounded-xl border border-border p-3 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.date} · {e.location}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-primary" /> Suggestions
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {suggestions.map((s) => (
              <li key={s} className="rounded-xl bg-secondary/50 px-3 py-2">
                {s}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {user.isAdmin && (
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">Currently online (admin only)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {online.map(([id]) => {
              const u = db.users.find((x) => x.id === id);
              return (
                <span
                  key={id}
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs"
                >
                  <span className="size-2 rounded-full bg-primary" />
                  {u?.fullName || u?.email || "Unknown"}
                </span>
              );
            })}
            {online.length === 0 && <p className="text-sm text-muted-foreground">Nobody online right now.</p>}
          </div>
        </section>
      )}
    </div>
  );
}