import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  describeClient,
  getDB,
  hashPassword,
  logActivity,
  lookupIp,
  makeSalt,
  setDB,
  subscribe,
  uid,
  type DB,
  type User,
} from "./store";

/**
 * Admin credentials come from build-time env vars so they are not hard-coded.
 * Development fallback only — a real deployment supplies these via secrets and
 * verifies them server-side.
 */
const ADMIN_EMAIL = (import.meta.env["VITE_ADMIN_EMAIL"] as string | undefined) ?? "admin@isg.edu.sa";
const ADMIN_PASSWORD = (import.meta.env["VITE_ADMIN_PASSWORD"] as string | undefined) ?? "admin";

export function useDB(): DB {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return getDB();
}

interface AuthValue {
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ created: boolean }>;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
  changePassword: (oldPassword: string, next: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useDB();
  const user = useMemo(
    () => db.users.find((u) => u.id === db.sessionUserId) ?? null,
    [db.users, db.sessionUserId],
  );

  // Presence heartbeat powers the admin "currently online" view.
  useEffect(() => {
    if (!user) return;
    const beat = () => setDB((d) => void (d.presence[user.id] = Date.now()));
    beat();
    const t = setInterval(beat, 15_000);
    return () => clearInterval(t);
  }, [user]);

  const signIn = useCallback(async (rawEmail: string, password: string) => {
    const email = rawEmail;
    const isAdmin = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
    const existing = getDB().users.find((u) => u.email === email);

    let created = false;
    let account: User;

    if (existing) {
      const hash = await hashPassword(password, existing.salt);
      if (!isAdmin && hash !== existing.passwordHash) throw new Error("Incorrect password for this account.");
      account = existing;
    } else {
      const salt = makeSalt();
      account = {
        id: uid(),
        email,
        salt,
        passwordHash: await hashPassword(password, salt),
        fullName: isAdmin ? "Club Admin" : "",
        dob: "",
        isAdmin,
        createdAt: Date.now(),
        onboarded: isAdmin,
      };
      created = true;
      setDB((d) => d.users.push(account));
    }

    const client = describeClient();
    const ip = await lookupIp();
    setDB((d) => {
      d.sessionUserId = account.id;
      d.logins.unshift({
        id: uid(),
        userId: account.id,
        email: account.email,
        ts: Date.now(),
        ip,
        device: client.device,
        browser: client.browser,
        os: client.os,
        userAgent: client.ua,
      });
      d.logins = d.logins.slice(0, 200);
      d.presence[account.id] = Date.now();
    });
    logActivity(account, "auth", created ? "Created account and signed in" : "Signed in");
    return { created };
  }, []);

  const signOut = useCallback(() => {
    const current = getDB().sessionUserId;
    setDB((d) => {
      if (current) delete d.presence[current];
      d.sessionUserId = null;
    });
  }, []);

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      if (!user) return;
      setDB((d) => {
        const target = d.users.find((u) => u.id === user.id);
        if (target) Object.assign(target, patch);
      });
      logActivity(user, "account", "Updated profile details");
    },
    [user],
  );

  const changePassword = useCallback(
    async (oldPassword: string, next: string) => {
      if (!user) return false;
      const check = await hashPassword(oldPassword, user.salt);
      if (check !== user.passwordHash) return false;
      const salt = makeSalt();
      const passwordHash = await hashPassword(next, salt);
      setDB((d) => {
        const target = d.users.find((u) => u.id === user.id);
        if (target) {
          target.salt = salt;
          target.passwordHash = passwordHash;
        }
      });
      logActivity(user, "account", "Changed password");
      return true;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, signIn, signOut, updateUser, changePassword }),
    [user, signIn, signOut, updateUser, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ONLINE_WINDOW_MS = 45_000;