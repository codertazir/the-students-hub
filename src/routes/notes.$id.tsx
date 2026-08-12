import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/students-hub-logo.png.asset.json";
import { NoteBlocksEditor } from "@/components/NoteBlocksEditor";
import { useAuth, useDB } from "@/lib/auth";
import { setDB, uid, type NoteBlock, type NoteBlockKind } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notes/$id")({
  head: () => ({
    meta: [
      { title: "Meeting note — The Students Hub" },
      { name: "description", content: "Read the meeting note and add your live response." },
      { property: "og:title", content: "Meeting note — The Students Hub" },
      { property: "og:description", content: "Read the meeting note and add your live response." },
    ],
  }),
  component: NoteDetailPage,
});


function NoteDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const db = useDB();
  const [editing, setEditing] = useState(false);
  const note = db.notes.find((n) => n.id === id);

  if (!user) return null;

  if (!note) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center rise-in">
        <p className="text-4xl">🔍</p>
        <p className="text-sm font-medium">This note doesn't exist anymore.</p>
        <Link to="/notes" className="text-sm text-primary underline underline-offset-4">
          Back to notes
        </Link>
      </div>
    );
  }

  const patchNote = (patch: Partial<typeof note>) => {
    setDB((d) => {
      const target = d.notes.find((n) => n.id === note.id);
      if (target) Object.assign(target, patch);
    });
  };

  const patchBlock = (blockId: string, patch: Partial<NoteBlock>) => {
    setDB((d) => {
      const target = d.notes.find((n) => n.id === note.id);
      const block = target?.blocks.find((b) => b.id === blockId);
      if (block) Object.assign(block, patch);
    });
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    setDB((d) => {
      const target = d.notes.find((n) => n.id === note.id);
      if (!target) return;
      const idx = target.blocks.findIndex((b) => b.id === blockId);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= target.blocks.length) return;
      const [moved] = target.blocks.splice(idx, 1);
      if (moved) target.blocks.splice(swap, 0, moved);
    });
  };

  const deleteBlock = (blockId: string) => {
    setDB((d) => {
      const target = d.notes.find((n) => n.id === note.id);
      if (target) target.blocks = target.blocks.filter((b) => b.id !== blockId);
    });
  };

  const addBlock = (kind: NoteBlockKind) => {
    setDB((d) => {
      const target = d.notes.find((n) => n.id === note.id);
      target?.blocks.push({
        id: uid(),
        kind,
        content: kind === "divider" ? "" : "New content",
        ...(kind === "input" ? { shared: "", allowAnonymous: true, mode: "live" as const, submissions: [] } : {}),
      });
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/notes"
              className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <img src={logo.url} alt="The Students Hub" className="h-7 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {note.title} <span className="text-muted-foreground">#{note.number}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{note.dateLabel}</p>
            </div>
          </div>
          {user.isAdmin && (
            <button
              onClick={() => setEditing((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                editing ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              <Pencil className="size-3.5" /> {editing ? "Done editing" : "Edit layout"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 rise-in">
        {editing && user.isAdmin && (
          <div className="surface-card mb-8 space-y-3 rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground">Note details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Title
                <input
                  value={note.title}
                  onChange={(e) => patchNote({ title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Number
                <input
                  type="number"
                  value={note.number}
                  onChange={(e) => patchNote({ number: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Date label
                <input
                  value={note.dateLabel}
                  onChange={(e) => patchNote({ dateLabel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Preview emoji
                <input
                  value={note.previewEmoji}
                  onChange={(e) => patchNote({ previewEmoji: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>
          </div>
        )}

        {!editing && (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {note.title} <span className="text-muted-foreground">#{note.number}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{note.dateLabel}</p>
          </div>
        )}

        <div className={cn(!editing && "mt-8")}>
          <NoteBlocksEditor
            blocks={note.blocks}
            editing={editing && user.isAdmin}
            scope={`note:${note.id}`}
            userId={user.id}
            userName={user.fullName.split(" ")[0] || "Member"}
            onPatchBlock={patchBlock}
            onMoveBlock={moveBlock}
            onDeleteBlock={deleteBlock}
            onAddBlock={addBlock}
            emptyLabel="No content in this note yet."
          />
        </div>
      </div>
    </div>
  );
}
