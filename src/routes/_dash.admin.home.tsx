import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutGrid, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth, useDB } from "@/lib/auth";
import { DEFAULT_HOME_CARDS, HOME_CARD_LABELS, setDB } from "@/lib/store";

export const Route = createFileRoute("/_dash/admin/home")({
  head: () => ({
    meta: [
      { title: "Home layout — Admin — The Students Hub" },
      { name: "description", content: "Choose which cards appear on the member home page and in what order." },
      { property: "og:title", content: "Home layout — Admin" },
      { property: "og:description", content: "Reorder and hide home page cards for every member." },
    ],
  }),
  component: HomeLayoutPage,
});

function HomeLayoutPage() {
  const { user } = useAuth();
  const db = useDB();
  if (!user) return null;
  if (!user.isAdmin) return <AdminOnly />;

  const move = (index: number, delta: number) => {
    setDB((d) => {
      const next = index + delta;
      if (next < 0 || next >= d.homeCards.length) return;
      const [card] = d.homeCards.splice(index, 1);
      if (card) d.homeCards.splice(next, 0, card);
    });
  };

  const toggle = (index: number) => {
    setDB((d) => {
      const card = d.homeCards[index];
      if (card) card.visible = !card.visible;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home page layout"
        description="Reorder or hide the cards every member sees on the home page. Changes sync to all devices instantly."
      />

      <section className="surface-card rise-in space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <LayoutGrid className="size-4" /> Cards
          </h2>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setDB((d) => {
                d.homeCards = DEFAULT_HOME_CARDS.map((c) => ({ ...c }));
              });
              toast.success("Layout reset to the default order.");
            }}
          >
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>

        <ul className="space-y-2">
          {db.homeCards.map((card, i) => (
            <li
              key={card.id}
              className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 transition-colors hover:bg-secondary/70"
            >
              <span className="w-6 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
              <p className={card.visible ? "flex-1 font-medium" : "flex-1 font-medium text-muted-foreground line-through"}>
                {HOME_CARD_LABELS[card.id]}
              </p>
              <button
                title={card.visible ? "Hide from home" : "Show on home"}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => toggle(i)}
              >
                {card.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button
                title="Move up"
                disabled={i === 0}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                title="Move down"
                disabled={i === db.homeCards.length - 1}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
