import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getDB,
  logActivity,
  setDB,
  subscribe,
  type DB,
  type User,
} from "./store";
import {
  getAdminData,
  getContent,
  getSessionUser,
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

export function useDB(): DB {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return getDB();
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ created: boolean }>;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
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
    dob: row.dateOfBirth ?? "",
    ...(row.phoneNumber ? { phone: row.phoneNumber } : {}),
    ...(row.profilePicture ? { avatar: row.profilePicture } : {}),
    isAdmin: row.role === "admin",
    createdAt: new Date(row.createdAt).getTime(),
    onboarded: row.role === "admin" ? Boolean(row.name) : Boolean(row.name && row.dateOfBirth),
  };
}

function mergeUser(row: NonNullable<SafeUser>) {
  const mapped = toStoreUser(row);
  setDB((d) => {
    const existing = d.users.find((u) => u.id === mapped.id);
    if (existing) Object.assign(existing, mapped);
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

  // Presence heartbeat powers the admin "currently online" view.
  useEffect(() => {
    if (!user) return;
    const beat = () => setDB((d) => void (d.presence[user.id] = Date.now()));
    beat();
    const t = setInterval(beat, 15_000);
    return () => clearInterval(t);
  }, [user]);

  // Pull notes/events (and admin monitoring data) from PostgreSQL.
  const hydrate = useCallback(async (isAdmin: boolean) => {
    try {
      const { notes, events } = await getContent();
      setDB((d) => {
        // First run against an empty database: keep the local drafts so the
        // mirror effect below pushes them up instead of wiping the UI.
        if (notes.length > 0 || d.notes.length === 0) {
          d.notes = notes.map((n) => {
          const local = d.notes.find((x) => x.id === n.id);
          return {
            id: n.id,
            title: n.title,
            meetingDate: n.date.slice(0, 10),
            html: n.content,
            boxes: local?.boxes ?? [],
            responses: local?.responses ?? [],
          };
        });
        }
        if (events.length > 0 || d.events.length === 0) {
          d.events = events.map((e) => {
          const local = d.events.find((x) => x.id === e.id);
          return {
            id: e.id,
            title: e.title,
            date: e.date.slice(0, 10),
            location: e.location ?? "",
            notes: e.description,
            ...(local?.poll ? { poll: local.poll } : {}),
            comments: local?.comments ?? [],
            folders: local?.folders ?? [],
          };
        });
        }
      });
    } catch {
      /* offline or not signed in — keep whatever is cached */
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
              data: { id: n.id, title: n.title, content: n.html, date: n.meetingDate || undefined },
            });
          }
          for (const e of db.events) {
            await upsertEvent({
              data: {
                id: e.id,
                title: e.title,
                description: e.notes,
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

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      if (!user) return;
      setDB((d) => {
        const target = d.users.find((u) => u.id === user.id);
        if (target) Object.assign(target, patch);
      });
      void saveProfile({
        data: {
          ...(patch.fullName !== undefined ? { name: patch.fullName } : {}),
          ...(patch.dob !== undefined ? { dateOfBirth: patch.dob } : {}),
          ...(patch.phone !== undefined ? { phoneNumber: patch.phone ?? null } : {}),
          ...(patch.avatar !== undefined ? { profilePicture: patch.avatar ?? null } : {}),
        },
      }).catch(() => undefined);
      logActivity(user, "account", "Updated profile details");
    },
    [user],
  );

  const changePassword = useCallback(
    async (oldPassword: string, next: string) => {
      if (!user) return false;
      const { ok } = await setPassword({ data: { oldPassword, nextPassword: next } });
      if (ok) logActivity(user, "account", "Changed password");
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
