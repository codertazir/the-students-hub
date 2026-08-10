import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { TasksPanel } from "@/components/TasksPanel";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_dash/admin/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Admin — The Students Hub" },
      { name: "description", content: "Create, assign and review club tasks." },
      { property: "og:title", content: "Tasks — Admin" },
      { property: "og:description", content: "Create, assign and review club tasks." },
    ],
  }),
  component: AdminTasksPage,
});

function AdminTasksPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Create assignments, manage member tasks and review completed work." />
      <section className="surface-card rise-in p-5">
        <TasksPanel limit={200} />
      </section>
    </div>
  );
}