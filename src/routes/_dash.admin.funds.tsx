import { createFileRoute } from "@tanstack/react-router";
import { PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth, useDB } from "@/lib/auth";
import { setDB } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin/funds")({
  head: () => ({
    meta: [
      { title: "Club Funds — Admin — The Students Hub" },
      { name: "description", content: "Manage the club's funds and financial summary." },
      { property: "og:title", content: "Club Funds — Admin" },
      { property: "og:description", content: "Manage the club's funds and financial summary." },
    ],
  }),
  component: FundsPage,
});

function FundsPage() {
  const { user } = useAuth();
  const db = useDB();
  const f = db.funds;

  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const update = (patch: Partial<typeof f>) =>
    setDB((d) => Object.assign(d.funds, patch, { updatedAt: Date.now() }));

  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    f.total || 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Club Funds" description="Manage the financial summary shown to members." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card rise-in space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PiggyBank className="size-4" /> Funds details
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={f.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Club Funds"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                value={f.currency}
                onChange={(e) => update({ currency: e.target.value })}
                placeholder="USD"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Total amount</Label>
              <Input
                type="number"
                value={f.total}
                onChange={(e) => update({ total: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Note</Label>
              <Input
                value={f.note}
                onChange={(e) => update({ note: e.target.value })}
                placeholder="Reserved for spring trip"
              />
            </div>
          </div>
        </section>

        <section className="surface-card gradient-primary rise-in flex h-fit flex-col items-center justify-center gap-1 p-8 text-center text-primary-foreground shadow-lift">
          <p className="text-xs uppercase tracking-wide opacity-80">{f.label || "Club Funds"}</p>
          <p className="text-4xl font-bold tabular-nums sm:text-5xl">
            {f.currency} {formatted}
          </p>
          {f.note && <p className="mt-2 text-sm opacity-90">{f.note}</p>}
          <p className="mt-3 text-xs opacity-70">
            Updated {new Date(f.updatedAt).toLocaleString()}
          </p>
        </section>
      </div>
    </div>
  );
}
