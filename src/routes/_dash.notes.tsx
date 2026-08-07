import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bold, EyeOff, Image as ImageIcon, Italic, Plus, Strikethrough, Underline } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth, useDB } from "@/lib/auth";
import { logActivity, setDB, uid } from "@/lib/store";

export const Route = createFileRoute("/_dash/notes")({
  head: () => ({
    meta: [
      { title: "Notes — The Students Hub" },
      { name: "description", content: "Meeting notes for the students club with open and anonymous response boxes." },
      { property: "og:title", content: "Notes — The Students Hub" },
      { property: "og:description", content: "Meeting notes with open and anonymous response boxes." },
    ],
  }),
  component: NotesPage,
});

const TYPING_WINDOW = 4000;

function NotesPage() {
  const { user } = useAuth();
  const db = useDB();
  const [activeId, setActiveId] = useState(db.notes[0]?.id ?? "");
  const note = db.notes.find((n) => n.id === activeId) ?? db.notes[0];
  if (!user || !note) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Each write-up is tied to a meeting date.</p>
        </div>
        {user.isAdmin && (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              setDB((d) =>
                d.notes.unshift({
                  id: uid(),
                  title: "Untitled meeting note",
                  meetingDate: new Date().toISOString().slice(0, 10),
                  html: "<p>Write the meeting summary here…</p>",
                  boxes: [],
                  responses: [],
                }),
              )
            }
          >
            <Plus className="size-4" /> New note
          </Button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {db.notes.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveId(n.id)}
            className={cn(
              "rounded-full border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5",
              n.id === note.id ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
            )}
          >
            {n.meetingDate}
          </button>
        ))}
      </div>

      <article className="surface-card rise-in p-6">
        {user.isAdmin ? (
          <input
            value={note.title}
            onChange={(e) =>
              setDB((d) => {
                const target = d.notes.find((x) => x.id === note.id);
                if (target) target.title = e.target.value;
              })
            }
            className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none"
          />
        ) : (
          <h2 className="text-xl font-semibold tracking-tight">{note.title}</h2>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Meeting on {note.meetingDate}</p>

        {user.isAdmin ? (
          <NoteEditor noteId={note.id} html={note.html} />
        ) : (
          <div
            className="prose-sm mt-5 space-y-3 text-sm leading-relaxed [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc"
            dangerouslySetInnerHTML={{ __html: note.html }}
          />
        )}
      </article>

      <div className="flex gap-3 rounded-xl border border-border bg-primary-soft p-4">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
        <p className="text-xs leading-relaxed text-accent-foreground">
          Anonymous mode hides your identity from other users, but the admin can still see who submitted the response
          for moderation and safety purposes.
        </p>
      </div>

      <div className="space-y-5">
        {note.boxes.map((box) => (
          <ResponseBox key={box.id} noteId={note.id} boxId={box.id} prompt={box.prompt} />
        ))}
        {user.isAdmin && (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              setDB((d) => {
                const target = d.notes.find((x) => x.id === note.id);
                target?.boxes.push({ id: uid(), prompt: "New question for members", plainOnly: true });
              })
            }
          >
            <Plus className="size-4" /> Add response box
          </Button>
        )}
      </div>
    </div>
  );
}

function NoteEditor({ noteId, html }: { noteId: string; html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cmd = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    save();
  };
  const save = () => {
    const next = ref.current?.innerHTML ?? "";
    setDB((d) => {
      const target = d.notes.find((x) => x.id === noteId);
      if (target) target.html = next;
    });
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1.5">
        {[
          { icon: Bold, command: "bold" },
          { icon: Italic, command: "italic" },
          { icon: Underline, command: "underline" },
          { icon: Strikethrough, command: "strikeThrough" },
        ].map((b) => (
          <button
            key={b.command}
            type="button"
            onClick={() => cmd(b.command)}
            className="rounded-lg p-2 transition-colors hover:bg-background"
          >
            <b.icon className="size-4" />
          </button>
        ))}
        <select
          onChange={(e) => cmd("fontSize", e.target.value)}
          className="rounded-lg bg-transparent px-2 py-1.5 text-sm outline-none"
          defaultValue="3"
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="6">Heading</option>
        </select>
        <select
          onChange={(e) => cmd("fontName", e.target.value)}
          className="rounded-lg bg-transparent px-2 py-1.5 text-sm outline-none"
          defaultValue="inherit"
        >
          <option value="inherit">Default font</option>
          <option value="Georgia">Serif</option>
          <option value="monospace">Mono</option>
        </select>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Image or file URL");
            if (url) cmd("insertImage", url);
          }}
          className="rounded-lg p-2 transition-colors hover:bg-background"
        >
          <ImageIcon className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={save}
        className="mt-3 min-h-32 rounded-xl border border-border p-4 text-sm leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-ring/30 [&_li]:ml-5 [&_li]:list-disc"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function ResponseBox({ noteId, boxId, prompt }: { noteId: string; boxId: string; prompt: string }) {
  const { user } = useAuth();
  const db = useDB();
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const note = db.notes.find((n) => n.id === noteId);
  const responses = note?.responses.filter((r) => r.boxId === boxId) ?? [];

  // Live "someone is typing" signal, shared through the store.
  useEffect(() => {
    const t = setInterval(() => setDB(() => {}), 2000);
    return () => clearInterval(t);
  }, []);

  const typingNames = Object.entries(db.typing)
    .filter(([key, v]) => key.startsWith(boxId + ":") && Date.now() - v.ts < TYPING_WINDOW && key !== `${boxId}:${user?.id}`)
    .map(([, v]) => v.name);

  if (!user) return null;

  return (
    <section className="surface-card p-5">
      <h3 className="text-sm font-semibold">{prompt}</h3>
      <div className="mt-3 space-y-2">
        {responses.map((r) => (
          <div key={r.id} className="rounded-xl bg-secondary/50 p-3 text-sm">
            <p className="text-xs font-medium text-accent-foreground">
              {user.isAdmin
                ? `${r.authorName}${r.anonymous ? " (submitted anonymously)" : ""}`
                : r.anonymous
                  ? "Anonymous Student"
                  : r.authorName}
            </p>
            <p className="mt-1 leading-relaxed">{r.text}</p>
          </div>
        ))}
        {responses.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
      </div>

      {typingNames.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-primary">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
        </p>
      )}

      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDB((d) => {
            d.typing[`${boxId}:${user.id}`] = {
              name: anonymous ? "Anonymous Student" : user.fullName || "A member",
              ts: Date.now(),
            };
          });
        }}
        placeholder="Type your response — plain text only"
        className="mt-4 min-h-24 rounded-xl"
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          Anonymous mode
        </label>
        <Button
          className="ml-auto rounded-full"
          disabled={!text.trim()}
          onClick={() => {
            setDB((d) => {
              const target = d.notes.find((n) => n.id === noteId);
              target?.responses.push({
                id: uid(),
                boxId,
                userId: user.id,
                authorName: user.fullName || user.email,
                anonymous,
                text: text.trim(),
                ts: Date.now(),
              });
              delete d.typing[`${boxId}:${user.id}`];
            });
            logActivity(user, "notes", `Responded to a note box${anonymous ? " anonymously" : ""}`);
            setText("");
            toast.success("Response submitted.");
          }}
        >
          Submit response
        </Button>
      </div>
    </section>
  );
}