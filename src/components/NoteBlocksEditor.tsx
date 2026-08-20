import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { ResponseBlockSettings, ResponseInput } from "@/components/ResponseInput";
import type { NoteBlock, NoteBlockKind } from "@/lib/store";
import { cn } from "@/lib/utils";

export const BLOCK_KINDS: NoteBlockKind[] = ["heading", "text", "callout", "divider", "input"];

export interface NoteBlocksEditorProps {
  blocks: NoteBlock[];
  /** Admin layout-editing mode. */
  editing: boolean;
  /** Scope key used by response blocks for typing presence, e.g. `note:<id>` / `event:<id>`. */
  scope: string;
  userId: string;
  userName: string;
  onPatchBlock: (blockId: string, patch: Partial<NoteBlock>) => void;
  onMoveBlock: (blockId: string, dir: -1 | 1) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddBlock: (kind: NoteBlockKind) => void;
  emptyLabel?: string;
}

/**
 * The one and only block renderer/editor used by both meeting notes and event
 * notes, so the admin editing experience is identical in both places.
 */
export function NoteBlocksEditor({
  blocks,
  editing,
  scope,
  userId,
  userName,
  onPatchBlock,
  onMoveBlock,
  onDeleteBlock,
  onAddBlock,
  emptyLabel = "No notes here yet.",
}: NoteBlocksEditorProps) {
  return (
    <div>
      <div className="space-y-6">
        {blocks.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
        {blocks.map((block, idx) => (
          <BlockView
            key={block.id}
            block={block}
            editing={editing}
            scope={scope}
            userId={userId}
            userName={userName}
            onPatch={(p) => onPatchBlock(block.id, p)}
            onMove={(d) => onMoveBlock(block.id, d)}
            onDelete={() => onDeleteBlock(block.id)}
            isFirst={idx === 0}
            isLast={idx === blocks.length - 1}
          />
        ))}
      </div>

      {editing && (
        <div className="mt-8 flex flex-wrap gap-2">
          {BLOCK_KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => onAddBlock(kind)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary"
            >
              <Plus className="size-3.5" /> {kind}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockView({
  block,
  editing,
  scope,
  userId,
  userName,
  onPatch,
  onMove,
  onDelete,
  isFirst,
  isLast,
}: {
  block: NoteBlock;
  editing: boolean;
  scope: string;
  userId: string;
  userName: string;
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
            {BLOCK_KINDS.map((k) => (
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
            <button
              onClick={onDelete}
              className="rounded-md p-1 text-destructive transition-colors hover:bg-secondary"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        {children}
      </div>
    ) : (
      <>{children}</>
    );

  if (block.kind === "divider") return wrapper(<hr className="border-border" />);

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
    <div className={cn(editing && "space-y-2")}>
      {editing ? (
        <div className="space-y-2">
          <input
            value={block.content}
            onChange={(e) => onPatch({ content: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="Prompt shown to members"
          />
          <ResponseBlockSettings block={block} onPatch={onPatch} />
        </div>
      ) : (
        <ResponseInput
          block={block}
          scope={scope}
          userId={userId}
          userName={userName}
          onPatch={onPatch}
        />
      )}
    </div>,
  );
}
