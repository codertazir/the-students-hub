/**
 * Shared response box for note/event "input" blocks.
 *
 * Two behaviours, chosen by the admin per block:
 *  - "live"   → one shared text area; everyone types into the same answer and
 *               sees edits (and who is typing) as they happen.
 *  - "submit" → each member writes their own answer and submits it; answers are
 *               collected in a list, optionally visible to everyone.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useDB } from "@/lib/auth";
import { setDB, uid, type NoteBlock, type NoteSubmission } from "@/lib/store";
import { cn } from "@/lib/utils";

const TYPING_WINDOW = 4000;
const FIELD =
  "w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary";

export function ResponseInput({
  block,
  scope,
  userId,
  userName,
  onPatch,
}: {
  block: NoteBlock;
  /** Unique prefix for typing keys, e.g. `note:<id>` or `event:<id>`. */
  scope: string;
  userId: string;
  userName: string;
  onPatch: (patch: Partial<NoteBlock>) => void;
}) {
  const mode = block.mode ?? "live";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {block.content}
        {block.mode === "submit" && (
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            your own answer
          </span>
        )}
      </p>
      {mode === "submit" ? (
        <SubmitResponse block={block} userId={userId} userName={userName} onPatch={onPatch} />
      ) : (
        <LiveResponse block={block} scope={scope} userId={userId} userName={userName} onPatch={onPatch} />
      )}
    </div>
  );
}

function LiveResponse({
  block,
  scope,
  userId,
  userName,
  onPatch,
}: {
  block: NoteBlock;
  scope: string;
  userId: string;
  userName: string;
  onPatch: (patch: Partial<NoteBlock>) => void;
}) {
  const db = useDB();
  const [anon, setAnon] = useState(false);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefix = `${scope}:${block.id}:`;
  const typingKey = `${prefix}${userId}`;

  const others = useMemo(() => {
    const now = Date.now();
    return Object.entries(db.typing)
      .filter(([key, v]) => key.startsWith(prefix) && key !== typingKey && now - v.ts < TYPING_WINDOW)
      .map(([, v]) => v.name);
  }, [db.typing, prefix, typingKey]);

  useEffect(
    () => () => {
      if (clearRef.current) clearTimeout(clearRef.current);
      setDB((d) => {
        delete d.typing[typingKey];
      });
    },
    [typingKey],
  );

  const label = anon ? "Anonymous" : userName;

  const handleChange = (value: string) => {
    onPatch({ shared: value, lastEditor: label, lastEditedAt: Date.now() });
    setDB((d) => {
      d.typing[typingKey] = { name: label, ts: Date.now() };
    });
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => {
      setDB((d) => {
        delete d.typing[typingKey];
      });
    }, 2500);
  };

  return (
    <>
      <textarea
        value={block.shared ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        placeholder={block.placeholder || "Type your response — everyone sees it live…"}
        className={FIELD}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-h-4">
          {block.lastEditedAt ? <span>Saved · edited by {block.lastEditor ?? "someone"}</span> : <span>No responses yet</span>}
          {others.length > 0 && <span className="ml-2 text-primary">{others.join(", ")} typing…</span>}
        </div>
        {block.allowAnonymous && (
          <label className="flex items-center gap-2">
            <Switch checked={anon} onCheckedChange={setAnon} />
            Post anonymously
          </label>
        )}
      </div>
    </>
  );
}

function SubmitResponse({
  block,
  userId,
  userName,
  onPatch,
}: {
  block: NoteBlock;
  userId: string;
  userName: string;
  onPatch: (patch: Partial<NoteBlock>) => void;
}) {
  const submissions = block.submissions ?? [];
  const mine = submissions.find((s) => s.userId === userId);
  const [draft, setDraft] = useState(mine?.text ?? "");
  const [anon, setAnon] = useState(mine?.anonymous ?? false);
  const [editing, setEditing] = useState(!mine);

  useEffect(() => {
    if (!editing) setDraft(mine?.text ?? "");
  }, [mine?.text, editing]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const entry: NoteSubmission = {
      id: mine?.id ?? uid(),
      userId,
      authorName: anon ? "Anonymous" : userName,
      text,
      ts: Date.now(),
      anonymous: anon,
    };
    const next = mine ? submissions.map((s) => (s.userId === userId ? entry : s)) : [...submissions, entry];
    onPatch({ submissions: next });
    setEditing(false);
    toast.success(mine ? "Answer updated." : "Answer submitted.");
  };

  const canEdit = !mine || block.allowEditAfterSubmit !== false;

  return (
    <>
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={block.placeholder || "Write your answer, then submit it…"}
            className={FIELD}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            >
              <Send className="size-3.5" /> {mine ? "Update answer" : "Submit answer"}
            </button>
            {block.allowAnonymous && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={anon} onCheckedChange={setAnon} />
                Submit anonymously
              </label>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-sm leading-relaxed">{mine?.text}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Submitted {mine ? new Date(mine.ts).toLocaleString() : ""}
            {mine?.anonymous ? " · anonymously" : ""}
          </p>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-xs font-medium text-primary transition-opacity hover:opacity-70"
            >
              Edit my answer
            </button>
          )}
        </div>
      )}

      {block.showAllSubmissions !== false && submissions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            {submissions.length} {submissions.length === 1 ? "answer" : "answers"}
          </p>
          {submissions
            .filter((s) => s.userId !== userId)
            .map((s) => (
              <div key={s.id} className={cn("rounded-xl bg-secondary/40 p-3")}>
                <p className="text-sm leading-relaxed">{s.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.authorName} · {new Date(s.ts).toLocaleString()}
                </p>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

/** Admin controls for an "input" block, shared by notes and events. */
export function ResponseBlockSettings({
  block,
  onPatch,
}: {
  block: NoteBlock;
  onPatch: (patch: Partial<NoteBlock>) => void;
}) {
  const mode = block.mode ?? "live";
  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Response type</span>
        {(["live", "submit"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onPatch({ mode: m })}
            className={cn(
              "rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
            )}
          >
            {m === "live" ? "Live shared box" : "Submit own answer"}
          </button>
        ))}
      </div>
      <input
        value={block.placeholder ?? ""}
        onChange={(e) => onPatch({ placeholder: e.target.value })}
        placeholder="Placeholder text inside the box (optional)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch checked={!!block.allowAnonymous} onCheckedChange={(v) => onPatch({ allowAnonymous: v })} />
        Allow anonymous responses
      </label>
      {mode === "submit" && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={block.allowEditAfterSubmit !== false}
              onCheckedChange={(v) => onPatch({ allowEditAfterSubmit: v })}
            />
            Members can edit their answer after submitting
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={block.showAllSubmissions !== false}
              onCheckedChange={(v) => onPatch({ showAllSubmissions: v })}
            />
            Members can read everyone's answers
          </label>
          <p className="text-xs text-muted-foreground">{(block.submissions ?? []).length} submitted so far</p>
        </>
      )}
    </div>
  );
}
