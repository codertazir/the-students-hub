import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, NotebookPen, Wallet } from "lucide-react";
import logo from "@/assets/students-hub-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Students Hub — Student club home base" },
      {
        name: "description",
        content:
          "The home base for the students club: meeting notes, events, tasks and announcements in one clean workspace.",
      },
      { property: "og:title", content: "The Students Hub" },
      { property: "og:description", content: "Meeting notes, events and tasks for the students club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/* ---------- animated preview screens (member-facing features only) ---------- */

const SCREENS = [
  {
    key: "notes",
    label: "Meeting notes",
    icon: NotebookPen,
    body: (
      <div className="grid h-full grid-cols-3 gap-2">
        {["❄️", "🚀", "🎯", "📌", "💡", "🗂️"].map((emoji, i) => (
          <div
            key={emoji}
            className="fade-slide flex flex-col overflow-hidden rounded-lg border border-border bg-card"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex flex-1 items-center justify-center bg-primary-soft text-lg">{emoji}</div>
            <div className="space-y-1 p-1.5">
              <div className="h-1.5 w-4/5 rounded-full bg-foreground/15" />
              <div className="h-1 w-2/5 rounded-full bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "events",
    label: "Events & polls",
    icon: CalendarDays,
    body: (
      <div className="flex h-full flex-col gap-2">
        {["Winter Showcase", "Community Drive"].map((title, i) => (
          <div
            key={title}
            className="fade-slide flex items-center gap-2 rounded-lg border border-border bg-card p-2"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-sm">
              {i === 0 ? "🎭" : "📚"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[9px] font-semibold">{title}</span>
              <span className="block text-[8px] text-muted-foreground">Main Hall · 17:00</span>
            </span>
          </div>
        ))}
        <div className="fade-slide space-y-1.5 rounded-lg border border-border bg-card p-2" style={{ animationDelay: "180ms" }}>
          <div className="text-[8px] font-semibold text-muted-foreground">Theme vote</div>
          {[72, 41, 18].map((w, i) => (
            <div key={w} className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${w}%`, transitionDelay: `${i * 120}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "tasks",
    label: "Your tasks",
    icon: CheckCircle2,
    body: (
      <div className="flex h-full flex-col gap-1.5">
        {[
          { t: "Submit your showcase idea", done: true },
          { t: "Read the handbook (p. 4–9)", done: true },
          { t: "Confirm drive attendance", done: false },
          { t: "Collect poster quote", done: false },
        ].map((row, i) => (
          <div
            key={row.t}
            className="fade-slide flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {row.done ? (
              <CheckCircle2 className="size-3 shrink-0 text-primary" />
            ) : (
              <Circle className="size-3 shrink-0 text-muted-foreground" />
            )}
            <span className={`truncate text-[9px] ${row.done ? "text-muted-foreground line-through" : ""}`}>{row.t}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "funds",
    label: "Club funds",
    icon: Wallet,
    body: (
      <div className="flex h-full flex-col justify-center gap-3 rounded-lg border border-border bg-card p-4">
        <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Club funds</span>
        <span className="fade-slide h-6 w-24 rounded-md bg-primary/25" aria-hidden="true" />
        <div className="space-y-1.5">
          {[64, 38].map((w, i) => (
            <div key={w} className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary/70 transition-[width] duration-700 ease-out"
                style={{ width: `${w}%`, transitionDelay: `${i * 140}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
  },
] as const;

function Landing() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SCREENS.length), 3600);
    return () => clearInterval(t);
  }, []);

  const screen = SCREENS[index]!;

  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[28rem] w-[46rem] -translate-x-1/2 rounded-[50%] bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-14rem] left-1/2 -z-10 h-[22rem] w-[36rem] -translate-x-1/2 rounded-[50%] bg-primary-glow/12 blur-3xl" />

      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <h1 className="rise-in sr-only">The Students Hub</h1>
        <img
          src={logo.url}
          alt="The Students Hub"
          width={1512}
          height={521}
          draggable={false}
          className="rise-in w-[min(88vw,32rem)] select-none transition-transform duration-500 hover:scale-[1.02]"
        />

        <Link
          to="/log-in"
          className="gradient-primary shadow-lift press rise-in group mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
        >
          Get Started
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      {/* laptop mockup with a cycling preview of member features */}
      <div className="rise-in float-soft mt-8 w-full max-w-2xl">
        <div className="surface-card overflow-hidden rounded-2xl p-2 shadow-lift">
          <div className="flex items-center gap-1.5 px-2 pb-2">
            <span className="size-2 rounded-full bg-destructive/40" />
            <span className="size-2 rounded-full bg-primary/30" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground transition-colors">
              <screen.icon className="size-3 text-primary" />
              {screen.label}
            </span>
          </div>
          <div className="h-[clamp(9rem,26vh,15rem)] overflow-hidden rounded-xl bg-secondary/50 p-3">
            <div key={screen.key} className="fade-slide h-full">
              {screen.body}
            </div>
          </div>
        </div>
        <div className="mx-auto h-2 w-2/3 rounded-b-2xl bg-foreground/10" />
        <div className="mt-3 flex justify-center gap-1.5">
          {SCREENS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.label}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
