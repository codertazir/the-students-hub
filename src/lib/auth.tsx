import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getDB,
  logActivity,
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
    isAdmin: row.role === "admin",
    createdAt: new Date(row.createdAt).getTime(),
    onboarded: row.role === "admin" ? Boolean(row.name) : Boolean(row.name && row.dateOfBirth),
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

  // Pull notes/events (and admin monitoring data) from PostgreSQL.
  const hydrate = useCallback(async (isAdmin: boolean) => {
    try {
      const { notes, events } = await getContent();
      setDB((d) => {
        // First run against an empty database: keep the local drafts so the
        // mirror effect below pushes them up instead of wiping the UI.
        if (notes.length > 0) {
          d.notes = notes.map((n, i) => {
            const local = d.notes.find((x) => x.id === n.id);
            const payload = parseJSON<Partial<Note>>(n.content);
            return {
              id: n.id,
              number: payload?.number ?? local?.number ?? i + 1,
              title: n.title,
              dateLabel: payload?.dateLabel ?? local?.dateLabel ?? n.date.slice(0, 10),
              meetingDate: n.date.slice(0, 10),
              previewEmoji: payload?.previewEmoji ?? local?.previewEmoji ?? "📝",
              previewAccent: payload?.previewAccent ?? local?.previewAccent ?? previewAccent(i),
              blocks: payload?.blocks ?? local?.blocks ?? [
                { id: `b-${n.id}`, kind: "text" as const, content: n.content },
              ],
              createdAt: local?.createdAt ?? new Date(n.date).getTime(),
            };
          });
        }
        if (events.length > 0) {
          d.events = events.map((e, i) => {
            const local = d.events.find((x) => x.id === e.id);
            const payload = parseJSON<Partial<ClubEvent>>(e.description);
            return {
              id: e.id,
              number: payload?.number ?? local?.number ?? i + 1,
              title: e.title,
              dateLabel: payload?.dateLabel ?? local?.dateLabel ?? e.date.slice(0, 10),
              date: e.date.slice(0, 10),
              location: e.location ?? "",
              previewEmoji: payload?.previewEmoji ?? local?.previewEmoji ?? "🎉",
              previewAccent: payload?.previewAccent ?? local?.previewAccent ?? previewAccent(i),
              completed: payload?.completed ?? local?.completed ?? false,
              blocks: payload?.blocks ?? local?.blocks ?? [
                { id: `b-${e.id}`, kind: "text" as const, content: e.description },
              ],
              cards: payload?.cards ?? local?.cards ?? [],
              comments: local?.comments ?? [],
              createdAt: local?.createdAt ?? new Date(e.date).getTime(),
            };
          });
        }
      });
    } catch {
      /* offline or not signed in — keep whatever is cached */
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
    } catch {
      /* keep local activity */
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
      /* not an admin */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void hydrate(user.isAdmin);
  }, [user?.id, user?.isAdmin, hydrate]);

  // Mirror admin edits of notes/events back into PostgreSQL.
  const synced = useRef<{ notes: Set<string>; events: Set<string> } | null>(null);
  useEffect(() => {
    if (!user?.isAdmin) return;
    const timer = setTimeout(() => {
      void (async () => {
        const noteIds = new Set(db.notes.map((n) => n.id));
        const eventIds = new Set(db.events.map((e) => e.id));
        const prev = synced.current;
        try {
          for (const n of db.notes) {
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
            for (const id of prev.notes) if (!noteIds.has(id)) await removeNote({ data: { id } });
            for (const id of prev.events) if (!eventIds.has(id)) await removeEvent({ data: { id } });
          }
        } catch {
          /* transient network issue — retried on the next change */
        }
        synced.current = { notes: noteIds, events: eventIds };
      })();
    }, 800);
    return () => clearTimeout(timer);
  }, [db.notes, db.events, user?.isAdmin]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: row, created } = await signInFn({ data: { email, password } });
    const mapped = mergeUser(row);
    logActivity(mapped, "auth", created ? "Created account and signed in" : "Signed in");
    void hydrate(mapped.isAdmin);
    return { created };
  }, [hydrate]);

  const signOut = useCallback(() => {
    const current = getDB().sessionUserId;
    setDB((d) => {
      if (current) delete d.presence[current];
      d.sessionUserId = null;
    });
    void signOutFn();
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
            ...(patch.preferredName !== undefined ? { preferredName: patch.preferredName ?? null } : {}),
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
