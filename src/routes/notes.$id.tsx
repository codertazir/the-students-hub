import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/students-hub-logo.png.asset.json";
import { Switch } from "@/components/ui/switch";
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

const TYPING_WINDOW = 4000;
const KINDS: NoteBlockKind[] = ["heading", "text", "callout", "divider", "input"];

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
        ...(kind === "input" ? { shared: "", allowAnonymous: true } : {}),
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

        <div className={cn("space-y-6", !editing && "mt-8")}>
          {note.blocks.map((block, idx) => (
            <BlockView
              key={block.id}
              block={block}
              editing={editing && user.isAdmin}
              noteId={note.id}
              userFirstName={user.fullName.split(" ")[0] || "Member"}
              userId={user.id}
              onPatch={(p) => patchBlock(block.id, p)}
              onMove={(d) => moveBlock(block.id, d)}
              onDelete={() => deleteBlock(block.id)}
              isFirst={idx === 0}
              isLast={idx === note.blocks.length - 1}
            />
          ))}
        </div>

        {editing && user.isAdmin && (
          <div className="mt-8 flex flex-wrap gap-2">
            {KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => addBlock(kind)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary"
              >
                <Plus className="size-3.5" /> {kind}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockView({
  block,
  editing,
  noteId,
  userFirstName,
  userId,
  onPatch,
  onMove,
  onDelete,
  isFirst,
  isLast,
}: {
  block: NoteBlock;
  editing: boolean;
  noteId: string;
  userFirstName: string;
  userId: string;
  onPatch: (patch: Partial<NoteBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const wrapper = (children: React.ReactNode) =>
    editing ? (
      <div className="group relative rounded-xl border border-dashed border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <select
            value={block.kind}
            onChange={(e) => onPatch({ kind: e.target.value as NoteBlockKind })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs capitalize outline-none"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              disabled={isFirst}
              onClick={() => onMove(-1)}
              className="rounded-md p-1 transition-colors hover:bg-secondary disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              disabled={isLast}
              onClick={() => onMove(1)}
              className="rounded-md p-1 transition-colors hover:bg-secondary disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button onClick={onDelete} className="rounded-md p-1 text-destructive transition-colors hover:bg-secondary">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        {children}
      </div>
    ) : (
      <>{children}</>
    );

  if (block.kind === "divider") {
    return wrapper(<hr className="border-border" />);
  }

  if (block.kind === "heading") {
    return wrapper(
      editing ? (
        <input
          value={block.content}
          onChange={(e) => onPatch({ content: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold outline-none"
        />
      ) : (
        <h2 className="text-xl font-semibold tracking-tight">{block.content}</h2>
      ),
    );
  }

  if (block.kind === "text") {
    return wrapper(
      editing ? (
        <textarea
          value={block.content}
          onChange={(e) => onPatch({ content: e.target.value })}
          rows={3}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
      ) : (
        <p className="text-sm leading-relaxed text-foreground">{block.content}</p>
      ),
    );
  }

  if (block.kind === "callout") {
    return wrapper(
      editing ? (
        <textarea
          value={block.content}
          onChange={(e) => onPatch({ content: e.target.value })}
          rows={2}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
      ) : (
        <div className="rounded-r-xl border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm leading-relaxed">
          {block.content}
        </div>
      ),
    );
  }

  // input block
  return wrapper(
    <div>
      {editing ? (
        <div className="space-y-2">
          <input
            value={block.content}
            onChange={(e) => onPatch({ content: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="Prompt shown to members"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={!!block.allowAnonymous} onCheckedChange={(v) => onPatch({ allowAnonymous: v })} />
            Allow anonymous responses
          </label>
        </div>
      ) : (
        <InputBlock block={block} noteId={noteId} userFirstName={userFirstName} userId={userId} onPatch={onPatch} />
      )}
    </div>,
  );
}

function InputBlock({
  block,
  noteId,
  userFirstName,
  userId,
  onPatch,
}: {
  block: NoteBlock;
  noteId: string;
  userFirstName: string;
  userId: string;
  onPatch: (patch: Partial<NoteBlock>) => void;
}) {
  const db = useDB();
  const [anon, setAnon] = useState(false);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingKey = `note:${noteId}:${block.id}:${userId}`;

  const others = useMemo(() => {
    const now = Date.now();
    return Object.entries(db.typing)
      .filter(([key, v]) => key.startsWith(`note:${noteId}:${block.id}:`) && key !== typingKey && now - v.ts < TYPING_WINDOW)
      .map(([, v]) => v.name);
  }, [db.typing, noteId, block.id, typingKey]);

  useEffect(
    () => () => {
      if (clearRef.current) clearTimeout(clearRef.current);
      setDB((d) => {
        delete d.typing[typingKey];
      });
    },
    [typingKey],
  );

  const handleChange = (value: string) => {
    onPatch({
      shared: value,
      lastEditor: anon ? "Anonymous" : userFirstName,
      lastEditedAt: Date.now(),
    });
    setDB((d) => {
      d.typing[typingKey] = { name: anon ? "Anonymous" : userFirstName, ts: Date.now() };
    });
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => {
      setDB((d) => {
        delete d.typing[typingKey];
      });
    }, 2500);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{block.content}</p>
      <textarea
        value={block.shared ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        placeholder="Type your response…"
        className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-h-[1rem]">
          {block.lastEditedAt ? (
            <span>Saved · edited by {block.lastEditor ?? "someone"}</span>
          ) : (
            <span>No responses yet</span>
          )}
          {others.length > 0 && <span className="ml-2 text-primary">{others.join(", ")} typing…</span>}
        </div>
        {block.allowAnonymous && (
          <label className="flex items-center gap-2">
            <Switch checked={anon} onCheckedChange={setAnon} />
            Post anonymously
          </label>
        )}
      </div>
    </div>
  );
}
