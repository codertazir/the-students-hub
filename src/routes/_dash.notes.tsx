import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useDB } from "@/lib/auth";
import { previewAccent, setDB, uid } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dash/notes")({
  head: () => ({
    meta: [
      { title: "Meeting notes — The Students Hub" },
      { name: "description", content: "Browse meeting notes and add your live responses." },
      { property: "og:title", content: "Meeting notes — The Students Hub" },
      { property: "og:description", content: "Browse meeting notes and add your live responses." },
    ],
  }),
  component: NotesPage,
});

const EMOJIS = ["📝", "🚀", "❄️", "🎯", "💡", "📌", "🎉", "🗓️"];

function NotesPage() {
  const { user } = useAuth();
  const db = useDB();
  const navigate = useNavigate();
  const [menuFor, setMenuFor] = useState<string | null>(null);

  if (!user) return null;

  const notes = [...db.notes].sort((a, b) => b.createdAt - a.createdAt || b.number - a.number);

  const createNote = () => {
    const nextNumber = db.notes.reduce((m, n) => Math.max(m, n.number), 0) + 1;
    const id = uid();
    const now = new Date();
    setDB((d) => {
      d.notes.unshift({
        id,
        number: nextNumber,
        title: "Untitled meeting note",
        dateLabel: `${now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`,
        meetingDate: now.toISOString().slice(0, 10),
        previewEmoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!,
        previewAccent: previewAccent(Math.floor(Math.random() * 6)),
        createdAt: Date.now(),
        blocks: [
          { id: uid(), kind: "heading", content: "Agenda" },
          { id: uid(), kind: "text", content: "Write a short summary of what was discussed." },
          { id: uid(), kind: "input", content: "Any thoughts or questions?", shared: "", allowAnonymous: true },
        ],
      });
    });
    void navigate({ to: "/notes/$id", params: { id } });
  };

  const deleteNote = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDB((d) => {
      d.notes = d.notes.filter((n) => n.id !== id);
    });
    setMenuFor(null);
    toast.success("Note deleted");
  };

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meeting notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every write-up from club meetings, with live response areas for members.
          </p>
        </div>
        {user.isAdmin && (
          <button
            onClick={createNote}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lift transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> New note
          </button>
        )}
      </header>

      {notes.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center gap-2 rounded-2xl border border-border p-16 text-center">
          <p className="text-4xl">🗒️</p>
          <p className="text-sm font-medium">No notes yet</p>
          <p className="text-xs text-muted-foreground">
            {user.isAdmin ? "Create the first meeting note to get started." : "Check back after the next meeting."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {notes.map((note) => (
            <div key={note.id} className="group relative">
              <Link
                to="/notes/$id"
                params={{ id: note.id }}
                className="surface-card block aspect-square overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div
                  className="flex h-[60%] items-center justify-center text-5xl"
                  style={{
                    background: `linear-gradient(135deg, ${note.previewAccent}33, ${note.previewAccent}11)`,
                  }}
                >
                  <span>{note.previewEmoji}</span>
                </div>
                <div className="flex h-[40%] flex-col justify-center gap-1 p-4">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">
                    {note.title} <span className="text-muted-foreground">#{note.number}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{note.dateLabel}</p>
                </div>
              </Link>
              {user.isAdmin && (
                <div className="absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuFor(menuFor === note.id ? null : note.id);
                    }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-200 group-hover:opacity-100",
                      menuFor === note.id && "opacity-100",
                    )}
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {menuFor === note.id && (
                    <div className="absolute right-0 top-9 z-10 w-36 rounded-xl border border-border bg-card p-1 shadow-lift">
                      <button
                        onClick={() => deleteNote(note.id, note.title)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-secondary"
                      >
                        <Trash2 className="size-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
