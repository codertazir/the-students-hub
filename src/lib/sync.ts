/**
 * Cross-device realtime sync.
 *
 * Everything shared by the club (announcements, suggestions, tasks, notes,
 * events, funds, presence, live note answers…) lives in a single server-side
 * document in PostgreSQL — the database is the source of truth. Each signed-in
 * device polls a cheap version stamp; whenever it moves, the device pulls the
 * document and applies it locally. Local changes are pushed back as a shallow
 * patch of only the keys that actually changed, so two people editing
 * different areas never overwrite each other.
 *
 * Reliability rules (these fix edits silently disappearing):
 *  1. A key with unsaved local changes is NEVER overwritten by a remote pull.
 *     Otherwise the 2.5s poll could clobber what the admin just typed.
 *  2. A failed push is retried with backoff instead of being dropped, and the
 *     key stays "dirty" until the server confirms it.
 *  3. Only one push is in flight at a time; changes made during a push are
 *     re-sent afterwards.
 *  4. Pending changes are flushed when the tab is hidden or closed.
 */

import { toast } from "sonner";
import { pullShared, pullSharedVersion, pushShared } from "./hub.functions";
import {
  getDB,
  setDB,
  subscribe,
  SHARED_KEYS,
  mergeHomeCards,
  mergeMonths,
  mergePlanColumns,
  type DB,
  type SharedKey,
} from "./store";

type Doc = Partial<Record<SharedKey, unknown>>;

const POLL_MS = 2_500;
const PUSH_DEBOUNCE_MS = 450;
const MAX_BACKOFF_MS = 15_000;

function snapshot(db: DB): Doc {
  const out: Doc = {};
  for (const key of SHARED_KEYS) out[key] = db[key];
  return out;
}

function fingerprint(doc: Doc) {
  const out: Record<string, string> = {};
  for (const key of SHARED_KEYS) out[key] = JSON.stringify(doc[key] ?? null);
  return out;
}

/** Newest wins for the volatile presence/typing maps. */
function mergeStamps(local: Record<string, number>, remote: Record<string, number>) {
  const out = { ...local };
  for (const [k, v] of Object.entries(remote ?? {})) if (!out[k] || v > out[k]) out[k] = v;
  return out;
}

function mergeTyping(
  local: Record<string, { name: string; ts: number }>,
  remote: Record<string, { name: string; ts: number }>,
) {
  const out = { ...local };
  for (const [k, v] of Object.entries(remote ?? {})) if (!out[k] || v.ts > out[k].ts) out[k] = v;
  return out;
}

export function startSync() {
  if (typeof window === "undefined") return () => undefined;

  let stopped = false;
  let version = -1;
  let applying = false;
  /** Fingerprint of what the server is known to hold, per key. */
  let confirmed = fingerprint(snapshot(getDB()));
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let backoff = 1_000;
  let pushing = false;
  let warned = false;
  let firstPull = true;
  /** Keys with local changes the server hasn't confirmed yet. */
  const dirty = new Set<SharedKey>();

  const markDirty = () => {
    const now = fingerprint(snapshot(getDB()));
    for (const key of SHARED_KEYS) if (now[key] !== confirmed[key]) dirty.add(key);
  };

  const applyRemote = (doc: Doc) => {
    // Never let the server's copy stomp on something being edited right now.
    markDirty();
    applying = true;
    setDB((d) => {
      for (const key of SHARED_KEYS) {
        const value = doc[key];
        if (value === undefined || value === null) continue;
        if (key === "presence") {
          d.presence = mergeStamps(d.presence, value as Record<string, number>);
          continue;
        }
        if (key === "typing") {
          d.typing = mergeTyping(d.typing, value as Record<string, { name: string; ts: number }>);
          continue;
        }
        if (dirty.has(key)) continue; // unsaved local edit wins until it's pushed
        if (key === "homeCards") {
          d.homeCards = mergeHomeCards(value as DB["homeCards"]);
        } else if (key === "planMonths") {
          d.planMonths = mergeMonths(value as DB["planMonths"]);
        } else if (key === "planColumns") {
          d.planColumns = mergePlanColumns(value as DB["planColumns"]);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (d as any)[key] = value;
        }
      }
    });
    applying = false;
    // Keys we accepted from the server are now in sync; dirty keys stay dirty.
    const now = fingerprint(snapshot(getDB()));
    for (const key of SHARED_KEYS) if (!dirty.has(key)) confirmed[key] = now[key]!;
    if (dirty.size > 0) schedulePush(0);
  };

  const pull = async () => {
    const res = await pullShared();
    if (!res) return; // signed out — nothing to sync
    const { version: v, data } = res;
    version = v;
    const doc = data as Doc;
    if (Object.keys(doc).length === 0 && firstPull) {
      // Nothing on the server yet — seed it from this device.
      firstPull = false;
      for (const key of SHARED_KEYS) dirty.add(key);
      await pushPending();
      return;
    }
    firstPull = false;
    applyRemote(doc);
  };

  /** Sends every dirty key; keeps them dirty (and retries) until confirmed. */
  const pushPending = async () => {
    if (pushing || stopped || dirty.size === 0) return;
    pushing = true;
    const keys = [...dirty];
    const current = snapshot(getDB());
    const sent = fingerprint(current);
    const patch: Doc = {};
    for (const key of keys) patch[key] = current[key];
    try {
      const res = await pushShared({ data: { patch: patch as Record<string, unknown> } });
      if (res) version = res.version;
      backoff = 1_000;
      warned = false;
      const now = fingerprint(snapshot(getDB()));
      for (const key of keys) {
        confirmed[key] = sent[key]!;
        // Changed again while the request was in flight → keep it dirty.
        if (now[key] === sent[key]) dirty.delete(key);
      }
    } catch (error) {
      console.error("[sync] failed to save changes", error);
      if (!warned) {
        warned = true;
        toast.error("Couldn't save your changes — retrying…");
      }
      retryTimer = setTimeout(() => void pushPending(), backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    } finally {
      pushing = false;
    }
    if (dirty.size > 0 && !retryTimer) schedulePush(PUSH_DEBOUNCE_MS);
  };

  const schedulePush = (delay: number) => {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void pushPending();
    }, delay);
  };

  const unsubscribe = subscribe(() => {
    if (applying) return;
    markDirty();
    if (dirty.size === 0) return;
    schedulePush(PUSH_DEBOUNCE_MS);
  });

  void pull().catch((e: unknown) => console.error("[sync] initial load failed", e));

  const timer = setInterval(() => {
    if (stopped || document.hidden) return;
    void pullSharedVersion()
      .then(async (v) => {
        if (v !== null && v !== version) await pull();
      })
      .catch(() => undefined);
  }, POLL_MS);

  const onVisible = () => {
    if (document.hidden) {
      markDirty();
      if (dirty.size > 0) void pushPending();
      return;
    }
    void pull().catch(() => undefined);
  };
  const onUnload = () => {
    markDirty();
    if (dirty.size > 0) void pushPending();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pagehide", onUnload);

  return () => {
    stopped = true;
    clearInterval(timer);
    if (pushTimer) clearTimeout(pushTimer);
    if (retryTimer) clearTimeout(retryTimer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pagehide", onUnload);
    unsubscribe();
  };
}
