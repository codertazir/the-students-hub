import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  MessageCircleQuestion,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ResponseBlockSettings, ResponseInput } from "@/components/ResponseInput";
import { useAuth, useDB } from "@/lib/auth";
import { logActivity, setDB, uid, type EventCard, type EventCardType, type NoteBlock, type NoteBlockKind } from "@/lib/store";
import { cn } from "@/lib/utils";
import logo from "@/assets/students-hub-logo.png.asset.json";

export const Route = createFileRoute("/events/$id")({
  head: () => ({
    meta: [
      { title: "Event details — The Students Hub" },
      { name: "description", content: "Event notes, polls, budget, files and discussion." },
      { property: "og:title", content: "Event details — The Students Hub" },
      { property: "og:description", content: "Event notes, polls, budget, files and discussion." },
    ],
  }),
  component: EventDetailPage,
});

const TYPING_TTL = 4000;
const FIELD = "rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring";

function EventDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const db = useDB();
  const [collapsed, setCollapsed] = useState(false);
  const event = db.events.find((e) => e.id === id);

  if (!user) return null;

  if (!event) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-center">
        <p className="text-4xl">🔍</p>
        <p className="text-sm font-medium">Event not found</p>
        <Link to="/events" className="text-sm text-primary hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <Link
          to="/events"
          className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <img src={logo.url} alt="The Students Hub" className="h-7 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {event.title} <span className="text-muted-foreground">#{event.number}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {event.dateLabel} · {event.location}
          </p>
        </div>
        {user.isAdmin && <AdminEventMeta event={event} />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary sm:flex"
          title={collapsed ? "Show cards panel" : "Collapse cards panel"}
        >
          {collapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
          {collapsed ? "Show cards" : "Focus notes"}
        </button>
      </header>

      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col gap-6 p-4 transition-all duration-300 ease-out sm:p-6",
          collapsed ? "lg:flex-row" : "lg:flex-row",
        )}
      >
        <div className={cn("min-w-0 transition-all duration-300 ease-out", collapsed ? "lg:flex-1" : "lg:w-3/5")}>
          <NotesPanel event={event} />
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            collapsed ? "hidden lg:block lg:w-0 lg:opacity-0" : "lg:w-2/5 lg:opacity-100",
          )}
        >
          <CardsPanel event={event} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- header admin meta ---------------- */

function AdminEventMeta({ event }: { event: ReturnType<typeof useDB>["events"][number] }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setEditing((e) => !e)}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
      >
        Edit event
      </button>
      {editing && (
        <div className="absolute right-0 top-10 z-30 w-72 space-y-2 rounded-xl border border-border bg-card p-3 shadow-lift">
          <Labeled label="Title">
            <input
              className={FIELD}
              value={event.title}
              onChange={(e) => setDB((d) => void (d.events.find((x) => x.id === event.id)!.title = e.target.value))}
            />
          </Labeled>
          <Labeled label="Number">
            <input
              type="number"
              className={FIELD}
              value={event.number}
              onChange={(e) =>
                setDB((d) => void (d.events.find((x) => x.id === event.id)!.number = Number(e.target.value) || 0))
              }
            />
          </Labeled>
          <Labeled label="Date & time label">
            <input
              className={FIELD}
              value={event.dateLabel}
              onChange={(e) => setDB((d) => void (d.events.find((x) => x.id === event.id)!.dateLabel = e.target.value))}
            />
          </Labeled>
          <Labeled label="Date (yyyy-mm-dd)">
            <input
              className={FIELD}
              value={event.date}
              onChange={(e) => setDB((d) => void (d.events.find((x) => x.id === event.id)!.date = e.target.value))}
            />
          </Labeled>
          <Labeled label="Location">
            <input
              className={FIELD}
              value={event.location}
              onChange={(e) => setDB((d) => void (d.events.find((x) => x.id === event.id)!.location = e.target.value))}
            />
          </Labeled>
          <Labeled label="Emoji">
            <input
              className={FIELD}
              value={event.previewEmoji}
              onChange={(e) => setDB((d) => void (d.events.find((x) => x.id === event.id)!.previewEmoji = e.target.value))}
            />
          </Labeled>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={event.completed}
              onChange={(e) => setDB((d) => void (d.events.find((x) => x.id === event.id)!.completed = e.target.checked))}
            />
            Completed
          </label>
        </div>
      )}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- left: notes/blocks ---------------- */

function NotesPanel({ event }: { event: ReturnType<typeof useDB>["events"][number] }) {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.isAdmin;

  const addBlock = (kind: NoteBlockKind) => {
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      if (!ev) return;
      const block: NoteBlock = { id: uid(), kind, content: kind === "divider" ? "" : "New content" };
      if (kind === "input") {
        block.shared = "";
        block.allowAnonymous = false;
        block.mode = "live";
        block.submissions = [];
      }
      ev.blocks.push(block);
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      if (!ev) return;
      const j = idx + dir;
      if (j < 0 || j >= ev.blocks.length) return;
      const [b] = ev.blocks.splice(idx, 1);
      ev.blocks.splice(j, 0, b!);
    });
  };

  const remove = (idx: number) => {
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      if (ev) ev.blocks.splice(idx, 1);
    });
  };

  return (
    <div className="surface-card space-y-4 rounded-2xl border border-border p-5 sm:p-7">
      {event.blocks.length === 0 && <p className="text-sm text-muted-foreground">No notes for this event yet.</p>}
      {event.blocks.map((block, idx) => (
        <div key={block.id} className="group relative">
          <BlockView event={event} block={block} />
          {isAdmin && (
            <div className="absolute -right-1 top-0 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <IconBtn onClick={() => move(idx, -1)}><ChevronLeft className="size-3.5 -rotate-90" /></IconBtn>
              <IconBtn onClick={() => move(idx, 1)}><ChevronRight className="size-3.5 -rotate-90" /></IconBtn>
              <IconBtn onClick={() => remove(idx)}><Trash2 className="size-3.5" /></IconBtn>
            </div>
          )}
          {isAdmin && <AdminBlockEditor event={event} block={block} idx={idx} />}
        </div>
      ))}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {(["heading", "text", "callout", "divider", "input"] as NoteBlockKind[]).map((k) => (
            <button
              key={k}
              onClick={() => addBlock(k)}
              className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary"
            >
              + {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary"
    >
      {children}
    </button>
  );
}

function AdminBlockEditor({
  event,
  block,
  idx,
}: {
  event: ReturnType<typeof useDB>["events"][number];
  block: NoteBlock;
  idx: number;
}) {
  if (block.kind === "divider") return null;
  if (block.kind === "input")
    return (
      <div className="mt-1.5 space-y-1.5">
        <textarea
          className={cn(FIELD, "w-full resize-none text-xs")}
          rows={2}
          value={block.content}
          placeholder="Prompt shown to members…"
          onChange={(e) =>
            setDB((d) => {
              const ev = d.events.find((x) => x.id === event.id);
              if (ev?.blocks[idx]) ev.blocks[idx]!.content = e.target.value;
            })
          }
        />
        <ResponseBlockSettings
          block={block}
          onPatch={(p) =>
            setDB((d) => {
              const ev = d.events.find((x) => x.id === event.id);
              const b = ev?.blocks[idx];
              if (b) Object.assign(b, p);
            })
          }
        />
      </div>
    );
  return (
    <textarea
      className={cn(FIELD, "mt-1.5 w-full resize-none text-xs")}
      rows={2}
      value={block.content}
      placeholder="Edit content…"
      onChange={(e) =>
        setDB((d) => {
          const ev = d.events.find((x) => x.id === event.id);
          if (ev?.blocks[idx]) ev.blocks[idx].content = e.target.value;
        })
      }
    />
  );
}

function BlockView({ event, block }: { event: ReturnType<typeof useDB>["events"][number]; block: NoteBlock }) {
  const { user } = useAuth();

  if (block.kind === "heading") return <h2 className="text-lg font-semibold tracking-tight">{block.content}</h2>;
  if (block.kind === "text") return <p className="text-sm leading-relaxed text-muted-foreground">{block.content}</p>;
  if (block.kind === "divider") return <hr className="border-border" />;
  if (block.kind === "callout")
    return (
      <div className="rounded-xl border border-primary/25 bg-primary-soft p-4 text-sm text-accent-foreground">
        {block.content}
      </div>
    );

  // input block — live shared box or per-member submissions
  const patch = (p: Partial<NoteBlock>) =>
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      const b = ev?.blocks.find((x) => x.id === block.id);
      if (b) Object.assign(b, p);
    });

  if (!user) return null;

  return (
    <ResponseInput
      block={block}
      scope={`event:${event.id}`}
      userId={user.id}
      userName={user.fullName || user.email}
      onPatch={patch}
    />
  );
}

/* ---------------- right: cards ---------------- */

const CARD_TYPES: EventCardType[] = ["poll", "budget", "stats", "info", "folder"];

function CardsPanel({ event }: { event: ReturnType<typeof useDB>["events"][number] }) {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.isAdmin;

  const visibleCards = isAdmin ? event.cards : event.cards.filter((c) => c.visible);

  const addCard = (type: EventCardType) => {
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      if (!ev) return;
      const card: EventCard = { id: uid(), type, title: `New ${type}`, visible: true };
      if (type === "poll") card.poll = { question: "New question", options: [{ id: uid(), label: "Option 1", votes: [] }] };
      if (type === "budget") card.budget = { total: 0, currency: "SAR", allocations: [] };
      if (type === "stats") card.stats = [{ id: uid(), label: "Metric", value: "0" }];
      if (type === "info") card.info = { body: "Details go here." };
      if (type === "folder") card.folder = { uploadsAllowed: true, files: [] };
      ev.cards.push(card);
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {visibleCards.length === 0 && (
        <div className="surface-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
          Nothing to show here yet.
        </div>
      )}
      {visibleCards.map((card, idx) => (
        <CardBlock key={card.id} event={event} card={card} idx={event.cards.findIndex((c) => c.id === card.id)} total={event.cards.length} />
      ))}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-border p-3">
          {CARD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => addCard(t)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary"
            >
              <Plus className="size-3" /> {t}
            </button>
          ))}
        </div>
      )}
      <CommentsBlock event={event} />
    </div>
  );
}

function CardBlock({
  event,
  card,
  idx,
  total,
}: {
  event: ReturnType<typeof useDB>["events"][number];
  card: EventCard;
  idx: number;
  total: number;
}) {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;

  const patchCard = (fn: (c: EventCard) => void) => {
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      const c = ev?.cards.find((x) => x.id === card.id);
      if (c) fn(c);
    });
  };

  const move = (dir: -1 | 1) => {
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      if (!ev) return;
      const j = idx + dir;
      if (j < 0 || j >= ev.cards.length) return;
      const [c] = ev.cards.splice(idx, 1);
      ev.cards.splice(j, 0, c!);
    });
  };

  const removeCard = () => {
    if (!window.confirm(`Delete card "${card.title}"?`)) return;
    setDB((d) => {
      const ev = d.events.find((x) => x.id === event.id);
      if (ev) ev.cards = ev.cards.filter((x) => x.id !== card.id);
    });
  };

  return (
    <div className={cn("surface-card space-y-3 rounded-2xl border border-border p-4 transition-opacity", !card.visible && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        {isAdmin ? (
          <input
            className={cn(FIELD, "flex-1 text-sm font-semibold")}
            value={card.title}
            onChange={(e) => patchCard((c) => void (c.title = e.target.value))}
          />
        ) : (
          <h3 className="text-sm font-semibold">{card.title}</h3>
        )}
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <IconBtn onClick={() => move(-1)}><ChevronLeft className="size-3.5 -rotate-90" /></IconBtn>
            <IconBtn onClick={() => move(1)}><ChevronRight className="size-3.5 -rotate-90" /></IconBtn>
            <IconBtn onClick={() => patchCard((c) => void (c.visible = !c.visible))}>
              {card.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </IconBtn>
            <IconBtn onClick={removeCard}><Trash2 className="size-3.5" /></IconBtn>
          </div>
        )}
      </div>

      {card.type === "poll" && card.poll && <PollCard event={event} card={card} />}
      {card.type === "budget" && card.budget && <BudgetCard event={event} card={card} />}
      {card.type === "stats" && card.stats && <StatsCard event={event} card={card} />}
      {card.type === "info" && card.info && <InfoCard event={event} card={card} />}
      {card.type === "folder" && card.folder && <FolderCard event={event} card={card} />}
    </div>
  );
}

function PollCard({ event, card }: { event: ReturnType<typeof useDB>["events"][number]; card: EventCard }) {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const poll = card.poll!;
  const total = poll.options.reduce((s, o) => s + o.votes.length, 0) || 1;

  const vote = (optId: string) => {
    if (!user) return;
    setDB((d) => {
      const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
      if (!c?.poll) return;
      const already = c.poll.options.find((o) => o.id === optId)?.votes.includes(user.id);
      c.poll.options.forEach((o) => (o.votes = o.votes.filter((v) => v !== user.id)));
      if (!already) c.poll.options.find((o) => o.id === optId)?.votes.push(user.id);
    });
  };

  const patch = (fn: () => void) =>
    setDB((d) => {
      const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
      if (c?.poll) fn.call(c.poll);
    });

  return (
    <div className="space-y-2">
      {isAdmin ? (
        <input
          className={cn(FIELD, "w-full text-sm")}
          value={poll.question}
          onChange={(e) =>
            setDB((d) => {
              const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
              if (c?.poll) c.poll.question = e.target.value;
            })
          }
        />
      ) : (
        <p className="text-sm font-medium">{poll.question}</p>
      )}
      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const pct = Math.round((o.votes.length / total) * 100);
          const mine = user && o.votes.includes(user.id);
          return (
            <div key={o.id} className="flex items-center gap-1.5">
              <button
                onClick={() => vote(o.id)}
                className={cn(
                  "relative flex-1 overflow-hidden rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors",
                  mine ? "border-primary/50 bg-primary-soft" : "hover:bg-secondary",
                )}
              >
                <span className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500" style={{ width: `${pct}%` }} />
                <span className="relative flex justify-between gap-2">
                  <span>{o.label}</span>
                  <span className="text-muted-foreground">{pct}% · {o.votes.length}</span>
                </span>
              </button>
              {isAdmin && (
                <IconBtn
                  onClick={() =>
                    setDB((d) => {
                      const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                      if (c?.poll) c.poll.options = c.poll.options.filter((x) => x.id !== o.id);
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </div>
          );
        })}
      </div>
      {isAdmin && (
        <button
          onClick={() =>
            setDB((d) => {
              const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
              c?.poll?.options.push({ id: uid(), label: `Option ${c.poll.options.length + 1}`, votes: [] });
            })
          }
          className="text-xs text-primary hover:underline"
        >
          + Add option
        </button>
      )}
    </div>
  );
}

function BudgetCard({ event, card }: { event: ReturnType<typeof useDB>["events"][number]; card: EventCard }) {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const budget = card.budget!;
  const allocated = budget.allocations.reduce((s, a) => s + a.amount, 0);
  const remaining = budget.total - allocated;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        {isAdmin ? (
          <input
            type="number"
            className={cn(FIELD, "w-28 text-sm font-semibold")}
            value={budget.total}
            onChange={(e) =>
              setDB((d) => {
                const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                if (c?.budget) c.budget.total = Number(e.target.value) || 0;
              })
            }
          />
        ) : (
          <p className="text-lg font-semibold">
            {budget.total.toLocaleString()} {budget.currency}
          </p>
        )}
        <p className={cn("text-xs", remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
          {remaining.toLocaleString()} {budget.currency} unallocated
        </p>
      </div>
      <div className="space-y-1.5">
        {budget.allocations.map((a) => {
          const pct = budget.total > 0 ? Math.min(100, Math.round((a.amount / budget.total) * 100)) : 0;
          return (
            <div key={a.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                {isAdmin ? (
                  <input
                    className={cn(FIELD, "w-32 text-xs")}
                    value={a.label}
                    onChange={(e) =>
                      setDB((d) => {
                        const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                        const al = c?.budget?.allocations.find((x) => x.id === a.id);
                        if (al) al.label = e.target.value;
                      })
                    }
                  />
                ) : (
                  <span>{a.label}</span>
                )}
                <span className="flex items-center gap-2 text-muted-foreground">
                  {isAdmin ? (
                    <input
                      type="number"
                      className={cn(FIELD, "w-20 text-xs")}
                      value={a.amount}
                      onChange={(e) =>
                        setDB((d) => {
                          const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                          const al = c?.budget?.allocations.find((x) => x.id === a.id);
                          if (al) al.amount = Number(e.target.value) || 0;
                        })
                      }
                    />
                  ) : (
                    <span>{a.amount.toLocaleString()} {budget.currency}</span>
                  )}
                  {isAdmin && (
                    <IconBtn
                      onClick={() =>
                        setDB((d) => {
                          const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                          if (c?.budget) c.budget.allocations = c.budget.allocations.filter((x) => x.id !== a.id);
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </IconBtn>
                  )}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {isAdmin && (
        <button
          onClick={() =>
            setDB((d) => {
              const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
              c?.budget?.allocations.push({ id: uid(), label: "New item", amount: 0 });
            })
          }
          className="text-xs text-primary hover:underline"
        >
          + Add allocation
        </button>
      )}
    </div>
  );
}

function StatsCard({ event, card }: { event: ReturnType<typeof useDB>["events"][number]; card: EventCard }) {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const stats = card.stats!;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.id} className="rounded-xl bg-secondary/50 p-3">
            {isAdmin ? (
              <>
                <input
                  className={cn(FIELD, "mb-1 w-full text-xs")}
                  value={s.label}
                  onChange={(e) =>
                    setDB((d) => {
                      const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                      const st = c?.stats?.find((x) => x.id === s.id);
                      if (st) st.label = e.target.value;
                    })
                  }
                />
                <input
                  className={cn(FIELD, "w-full text-sm font-semibold")}
                  value={s.value}
                  onChange={(e) =>
                    setDB((d) => {
                      const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                      const st = c?.stats?.find((x) => x.id === s.id);
                      if (st) st.value = e.target.value;
                    })
                  }
                />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </>
            )}
          </div>
        ))}
      </div>
      {isAdmin && (
        <button
          onClick={() =>
            setDB((d) => {
              const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
              c?.stats?.push({ id: uid(), label: "Metric", value: "0" });
            })
          }
          className="text-xs text-primary hover:underline"
        >
          + Add stat
        </button>
      )}
    </div>
  );
}

function InfoCard({ event, card }: { event: ReturnType<typeof useDB>["events"][number]; card: EventCard }) {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const info = card.info!;
  return isAdmin ? (
    <textarea
      className={cn(FIELD, "w-full resize-none text-sm")}
      rows={3}
      value={info.body}
      onChange={(e) =>
        setDB((d) => {
          const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
          if (c?.info) c.info.body = e.target.value;
        })
      }
    />
  ) : (
    <p className="text-sm leading-relaxed text-muted-foreground">{info.body}</p>
  );
}

function FolderCard({ event, card }: { event: ReturnType<typeof useDB>["events"][number]; card: EventCard }) {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.isAdmin;
  const folder = card.folder!;
  const canUpload = isAdmin || folder.uploadsAllowed;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {folder.files.length === 0 && <p className="text-xs text-muted-foreground">No files yet.</p>}
        {folder.files.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
            <span className="truncate">
              {f.name} <span className="text-muted-foreground">· {f.by}</span>
            </span>
            {isAdmin && (
              <IconBtn
                onClick={() =>
                  setDB((d) => {
                    const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                    if (c?.folder) c.folder.files = c.folder.files.filter((x) => x.id !== f.id);
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </IconBtn>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        {canUpload ? (
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary hover:underline">
            <Upload className="size-3.5" /> Upload
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setDB((d) => {
                  const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                  c?.folder?.files.push({ id: uid(), name: file.name, by: user.fullName || user.email, ts: Date.now() });
                });
                logActivity(user, "events", `Uploaded ${file.name} to ${card.title}`);
                toast.success("File added.");
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Uploads are admin-only right now
          </span>
        )}
        {isAdmin && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={folder.uploadsAllowed}
              onChange={(e) =>
                setDB((d) => {
                  const c = d.events.find((x) => x.id === event.id)?.cards.find((x) => x.id === card.id);
                  if (c?.folder) c.folder.uploadsAllowed = e.target.checked;
                })
              }
            />
            Allow member uploads
          </label>
        )}
      </div>
    </div>
  );
}

/* ---------------- comments ---------------- */

function CommentsBlock({ event }: { event: ReturnType<typeof useDB>["events"][number] }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"comment" | "question">("comment");
  if (!user) return null;

  const sorted = [...event.comments].sort((a, b) => b.ts - a.ts);

  return (
    <div className="surface-card space-y-3 rounded-2xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircleQuestion className="size-4 text-primary" /> Comments & questions
      </h3>
      <div className="space-y-2">
        {sorted.map((c) => (
          <div key={c.id} className="rounded-xl bg-secondary/50 p-3 text-sm">
            <p className="text-xs font-medium text-accent-foreground">
              {c.authorName} · {c.kind === "question" ? "Question" : "Comment"}
            </p>
            <p className="mt-1">{c.text}</p>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">Be the first to post.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={kind === "question" ? "Ask a question…" : "Share a comment…"}
          className={cn(FIELD, "min-w-40 flex-1")}
        />
        <button
          onClick={() => setKind(kind === "comment" ? "question" : "comment")}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
        >
          {kind === "comment" ? "Comment" : "Question"}
        </button>
        <button
          disabled={!text.trim()}
          onClick={() => {
            setDB((d) => {
              d.events
                .find((e) => e.id === event.id)
                ?.comments.push({
                  id: uid(),
                  userId: user.id,
                  authorName: user.fullName || user.email,
                  text: text.trim(),
                  kind,
                  ts: Date.now(),
                });
            });
            logActivity(user, "events", `Posted a ${kind} on ${event.title}`);
            setText("");
          }}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  );
}
