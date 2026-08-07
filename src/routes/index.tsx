import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, NotebookPen, ShieldCheck } from "lucide-react";
import laptop from "@/assets/dashboard-laptop.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Students Hub — Student club home base" },
      {
        name: "description",
        content:
          "The hub used for the students club. Meeting notes, events, announcements and tasks in one clean workspace.",
      },
      { property: "og:title", content: "The Students Hub" },
      { property: "og:description", content: "The hub used for the students club." },
    ],
  }),
  component: Landing,
});

const highlights = [
  { icon: NotebookPen, title: "Meeting notes", body: "Every meeting written up, with response boxes you can answer openly or anonymously." },
  { icon: CalendarDays, title: "Events & polls", body: "Plan events, vote on ideas, ask questions and share the media folder." },
  { icon: ShieldCheck, title: "Safe by default", body: "School email only, hashed passwords and monitored sign-in activity." },
];

function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="gradient-primary flex size-8 items-center justify-center rounded-xl text-sm text-primary-foreground">
            SH
          </span>
          The Students Hub
        </span>
        <Link
          to="/log-in"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-10 text-center sm:pt-16">
        <span className="rise-in inline-flex items-center gap-2 rounded-full border border-border bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
          For members of the students club
        </span>
        <h1 className="rise-in mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
          The Students Hub
        </h1>
        <p className="rise-in mt-4 text-lg text-muted-foreground">The hub used for the students club</p>
        <div className="rise-in mt-8 flex justify-center">
          <Link
            to="/log-in"
            className="gradient-primary shadow-lift group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <div className="relative mx-auto mt-14 max-w-5xl px-6" aria-hidden={false}>
        <div className="absolute inset-x-16 top-16 -z-10 h-64 rounded-[50%] bg-primary/15 blur-3xl" />
        <img
          src={laptop}
          width={1600}
          height={1008}
          alt="The Students Hub dashboard shown on a laptop"
          className="rise-in w-full select-none"
          draggable={false}
        />
      </div>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {highlights.map((h) => (
          <article
            key={h.title}
            className="surface-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <h.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">{h.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}