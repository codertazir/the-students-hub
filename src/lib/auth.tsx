import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getDB,
  previewAccent,
  setDB,
  subscribe,
  ssrDB,
  type ActivityLog,
  type ClubEvent,
  type DB,
  type Note,
  type User,
} from "./store";
import { startSync } from "./sync";
import { isStaff, normalizeRole } from "./permissions";

import {
  getActivity,
  getAdminData,
  getContent,
  getSessionUser,
  heartbeat,
  removeEvent,
  removeNote,
  saveProfile,
  setPassword,
  signIn as signInFn,
  signOut as signOutFn,
  upsertEvent,
  upsertNote,
} from "./hub.functions";

type SafeUser = Awaited<ReturnType<typeof getSessionUser>>;

/** Structured note/event payloads travel as JSON inside the text columns. */
function parseJSON<T>(raw: string): T | null {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as T) : null;
  } catch {
    return null;
  }
}

export function useDB(): DB {
  const [, force] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    return subscribe(() => force((n) => n + 1));
  }, []);
  return hydrated ? getDB() : ssrDB();
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ created: boolean }>;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, next: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** DB user (no password ever leaves the server) → shape the UI already uses. */
function toStoreUser(row: NonNullable<SafeUser>): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: "",
    salt: "",
    fullName: row.name,
    ...(row.preferredName ? { preferredName: row.preferredName } : {}),
    dob: row.dateOfBirth ?? "",
    ...(row.phoneNumber ? { phone: row.phoneNumber } : {}),
    ...(row.profilePicture ? { avatar: row.profilePicture } : {}),
    role: normalizeRole(row.role),
    isAdmin: isStaff(row.role),
    createdAt: new Date(row.createdAt).getTime(),
    onboarded: isStaff(row.role) ? Boolean(row.name) : Boolean(row.name && row.dateOfBirth),
  };
}

/** Replaces the cached copy wholesale so the database always wins. */
function mergeUser(row: NonNullable<SafeUser>) {
  const mapped = toStoreUser(row);
  setDB((d) => {
    const index = d.users.findIndex((u) => u.id === mapped.id);
    if (index >= 0) d.users[index] = mapped;
    else d.users.push(mapped);
    d.sessionUserId = mapped.id;
    d.presence[mapped.id] = Date.now();
  });
  return mapped;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useDB();
  const [loading, setLoading] = useState(true);
  const user = useMemo(
    () => db.users.find((u) => u.id === db.sessionUserId) ?? null,
    [db.users, db.sessionUserId],
  );

  // Restore the server session (encrypted cookie) on first load.
  useEffect(() => {
    let alive = true;
    void getSessionUser()
      .then((row) => {
        if (!alive) return;
        if (row) mergeUser(row);
        else setDB((d) => void (d.sessionUserId = null));
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Presence heartbeat — written to the database so "online now" and
  // "last active" survive refreshes and work across devices.
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      setDB((d) => void (d.presence[user.id] = Date.now()));
      void heartbeat().catch(() => undefined);
    };
    beat();
    const t = setInterval(beat, 15_000);
    return () => clearInterval(t);
  }, [user?.id]);

  // Keep every signed-in device on the same shared document.
  useEffect(() => {
    if (!user) return;
    return startSync();
  }, [user?.id]);

  /**
   * Notes and events live in the shared PostgreSQL document (shared_state),
   * which the sync loop keeps authoritative across devices. The notes/events
   * tables are a durable secondary copy used only to RECOVER rows that the
   * shared document doesn't have yet — adopting a table row on top of an
   * existing note used to overwrite fresher content (and then push that stale
   * copy to every other device), which is why note edits and member responses
   * appeared to "not save".
   */
  const hydrate = useCallback(async (isAdmin: boolean) => {
    try {
      const { notes, events } = await getContent();
      setDB((d) => {
        const noteIds = new Set(d.notes.map((n) => n.id));
        const missingNotes = notes.filter((n) => !noteIds.has(n.id));
        missingNotes.forEach((n, i) => {
          const payload = parseJSON<Partial<Note>>(n.content);
          d.notes.push({
            id: n.id,
            number: payload?.number ?? d.notes.length + i + 1,
            title: n.title,
            dateLabel: payload?.dateLabel ?? n.date.slice(0, 10),
            meetingDate: n.date.slice(0, 10),
            previewEmoji: payload?.previewEmoji ?? "📝",
            previewAccent: payload?.previewAccent ?? previewAccent(i),
            blocks: payload?.blocks ?? [
              { id: `b-${n.id}`, kind: "text" as const, content: n.content },
            ],
            createdAt: new Date(n.date).getTime(),
          });
        });
        const eventIds = new Set(d.events.map((e) => e.id));
        const missingEvents = events.filter((e) => !eventIds.has(e.id));
        missingEvents.forEach((e, i) => {
          const payload = parseJSON<Partial<ClubEvent>>(e.description);
          d.events.push({
            id: e.id,
            number: payload?.number ?? d.events.length + i + 1,
            title: e.title,
            dateLabel: payload?.dateLabel ?? e.date.slice(0, 10),
            date: e.date.slice(0, 10),
            location: e.location ?? "",
            previewEmoji: payload?.previewEmoji ?? "🎉",
            previewAccent: payload?.previewAccent ?? previewAccent(i),
            completed: payload?.completed ?? false,
            blocks: payload?.blocks ?? [
              { id: `b-${e.id}`, kind: "text" as const, content: e.description },
            ],
            cards: payload?.cards ?? [],
            comments: [],
            createdAt: new Date(e.date).getTime(),
          });
        });
      });
    } catch (error) {
      console.error("[hub] could not load notes and events", error);
    }
    try {
      const rows = await getActivity();
      setDB((d) => {
        d.activity = rows.map((r) => ({
          id: r.id,
          userId: r.userId ?? "",
          email: r.email,
          area: (r.area as ActivityLog["area"]) ?? "account",
          action: r.action,
          ts: new Date(r.ts).getTime(),
          ...(r.ipAddress ? { ip: r.ipAddress } : {}),
          ...(r.device ? { device: r.device } : {}),
          ...(r.browser ? { browser: r.browser } : {}),
          ...(r.os ? { os: r.os } : {}),
        }));
      });
    } catch (error) {
      console.error("[hub] could not load the activity log", error);
    }
    if (!isAdmin) return;
    try {
      const { users, logins } = await getAdminData();
      setDB((d) => {
        d.users = users.map(toStoreUser);
        d.logins = logins.map((l) => ({
          id: l.id,
          userId: l.userId ?? "",
          email: l.email,
          ts: new Date(l.timestamp).getTime(),
          ip: l.ipAddress ?? "unavailable",
          device: l.device ?? "Unknown",
          browser: l.browser ?? "Unknown browser",
          os: l.os ?? "Unknown OS",
          userAgent: l.userAgent ?? "unknown",
        }));
      });
    } catch {
      /* member accounts are admin-only — ignore for regular members */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void hydrate(user.isAdmin);
  }, [user?.id, user?.isAdmin, hydrate]);

  /**
   * Mirrors notes/events into their own tables. Only rows whose payload
   * actually changed are written, so typing in a note no longer fires one
   * request per note on every keystroke.
   */
  const mirrored = useRef<{ notes: Map<string, string>; events: Map<string, string> } | null>(null);
  useEffect(() => {
    if (!user?.isAdmin) return;
    const timer = setTimeout(() => {
      void (async () => {
        const notePayloads = new Map(
          db.notes.map((n) => [
            n.id,
            JSON.stringify({
              title: n.title,
              date: n.meetingDate,
              number: n.number,
              dateLabel: n.dateLabel,
              previewEmoji: n.previewEmoji,
              previewAccent: n.previewAccent,
              blocks: n.blocks,
            }),
          ]),
        );
        const eventPayloads = new Map(
          db.events.map((e) => [
            e.id,
            JSON.stringify({
              title: e.title,
              date: e.date,
              location: e.location,
              number: e.number,
              dateLabel: e.dateLabel,
              previewEmoji: e.previewEmoji,
              previewAccent: e.previewAccent,
              completed: e.completed,
              blocks: e.blocks,
              cards: e.cards,
            }),
          ]),
        );
        const prev = mirrored.current;
        try {
          for (const n of db.notes) {
            if (prev && prev.notes.get(n.id) === notePayloads.get(n.id)) continue;
            await upsertNote({
              data: {
                id: n.id,
                title: n.title,
                content: JSON.stringify({
                  number: n.number,
                  dateLabel: n.dateLabel,
                  previewEmoji: n.previewEmoji,
                  previewAccent: n.previewAccent,
                  blocks: n.blocks,
                }),
                date: n.meetingDate || undefined,
              },
            });
          }
          for (const e of db.events) {
            if (prev && prev.events.get(e.id) === eventPayloads.get(e.id)) continue;
            await upsertEvent({
              data: {
                id: e.id,
                title: e.title,
                description: JSON.stringify({
                  number: e.number,
                  dateLabel: e.dateLabel,
                  previewEmoji: e.previewEmoji,
                  previewAccent: e.previewAccent,
                  completed: e.completed,
                  blocks: e.blocks,
                  cards: e.cards,
                }),
                date: e.date || undefined,
                location: e.location || null,
              },
            });
          }
          if (prev) {
            for (const id of prev.notes.keys())
              if (!notePayloads.has(id)) await removeNote({ data: { id } });
            for (const id of prev.events.keys())
              if (!eventPayloads.has(id)) await removeEvent({ data: { id } });
          }
          mirrored.current = { notes: notePayloads, events: eventPayloads };
        } catch (error) {
          // Leave the previous snapshot in place so the next change retries.
          console.error("[hub] could not mirror notes and events", error);
        }
      })();
    }, 800);
    return () => clearTimeout(timer);
  }, [db.notes, db.events, user?.isAdmin]);


  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user: row, created } = await signInFn({ data: { email, password } });
      const mapped = mergeUser(row);
      // The sign-in itself is logged server-side (login log + activity log).
      void hydrate(mapped.isAdmin);
      return { created };
    },
    [hydrate],
  );

  const signOut = useCallback(() => {
    const current = getDB().sessionUserId;
    // Save anything still pending BEFORE the session ends, otherwise the last
    // edits would be pushed with no session and silently dropped.
    void flushShared()
      .catch(() => undefined)
      .finally(() => {
        setDB((d) => {
          if (current) delete d.presence[current];
          d.sessionUserId = null;
        });
        void signOutFn();
      });
  }, []);


  /**
   * Writes the change to PostgreSQL and then re-seeds the local cache from the
   * row the server returns, so what you see is always what is stored.
   */
  const updateUser = useCallback(
    async (patch: Partial<User>) => {
      if (!user) return false;
      setDB((d) => {
        const target = d.users.find((u) => u.id === user.id);
        if (target) Object.assign(target, patch);
      });
      try {
        const row = await saveProfile({
          data: {
            ...(patch.fullName !== undefined ? { name: patch.fullName } : {}),
            ...(patch.preferredName !== undefined
              ? { preferredName: patch.preferredName ?? null }
              : {}),
            ...(patch.dob !== undefined ? { dateOfBirth: patch.dob } : {}),
            ...(patch.phone !== undefined ? { phoneNumber: patch.phone ?? null } : {}),
            ...(patch.avatar !== undefined ? { profilePicture: patch.avatar ?? null } : {}),
          },
        });
        mergeUser(row);
        return true;
      } catch {
        // Re-read the stored row so the UI never keeps an unsaved value.
        const fresh = await getSessionUser().catch(() => null);
        if (fresh) mergeUser(fresh);
        return false;
      }
    },
    [user],
  );

  const changePassword = useCallback(
    async (oldPassword: string, next: string) => {
      if (!user) return false;
      const { ok } = await setPassword({ data: { oldPassword, nextPassword: next } });
      return ok;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, updateUser, changePassword }),
    [user, loading, signIn, signOut, updateUser, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ONLINE_WINDOW_MS = 45_000;
