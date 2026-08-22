import { Link } from "@tanstack/react-router";

export function AdminOnly({
  title = "Admins only",
  description = "This area is restricted to club admins.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="surface-card rise-in mx-auto max-w-md p-8 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Link
        to="/home"
        className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-105"
      >
        Back to home
      </Link>
    </div>
  );
}
