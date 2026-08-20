import { createFileRoute } from "@tanstack/react-router";
import { TasksPanel } from "@/components/TasksPanel";

export const Route = createFileRoute("/_dash/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — The Students Hub" },
      {
        name: "description",
        content:
          "Every club task in one place: create tasks, assign them to members and track what's done.",
      },
      { property: "og:title", content: "Tasks — The Students Hub" },
      {
        property: "og:description",
        content: "Create tasks, assign them to members and track completion.",
      },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  return (
    <div className="space-y-6">
      <header className="rise-in">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything assigned to you or the club — create your own and assign work to other members.
        </p>
      </header>
      <section className="surface-card rise-in p-5">
        <TasksPanel limit={100} />
      </section>
    </div>
  );
}
