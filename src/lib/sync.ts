/**
 * Cross-device realtime sync.
 *
 * Everything shared by the club (announcements, suggestions, tasks, notes,
 * events, funds, presence, live note answers…) lives in a single server-side
 * document. Each signed-in device polls a cheap version stamp; whenever it
 * moves, the device pulls the document and applies it locally. Local changes
 * are pushed back as a shallow patch of only the keys that actually changed,
 * so two people editing different areas never overwrite each other.
 */

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
  let last = fingerprint(snapshot(getDB()));
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let firstPull = true;

  const applyRemote = (doc: Doc) => {
    applying = true;
    setDB((d) => {
      for (const key of SHARED_KEYS) {
        const value = doc[key];
        if (value === undefined || value === null) continue;
        if (key === "presence") {
          d.presence = mergeStamps(d.presence, value as Record<string, number>);
        } else if (key === "typing") {
          d.typing = mergeTyping(d.typing, value as Record<string, { name: string; ts: number }>);
        } else if (key === "homeCards") {
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
    last = fingerprint(snapshot(getDB()));
    applying = false;
  };

  const pull = async () => {
    const res = await pullShared();
    if (!res) return; // signed out — nothing to sync
    const { version: v, data } = res;
    version = v;
    const doc = data as Doc;
    const empty = Object.keys(doc).length === 0;
    if (empty && firstPull) {
      // Nothing on the server yet — seed it from this device.
      firstPull = false;
      await push(snapshot(getDB()));
      return;
    }
    firstPull = false;
    applyRemote(doc);
  };

  const push = async (patch: Doc) => {
    if (Object.keys(patch).length === 0) return;
    const res = await pushShared({ data: { patch: patch as Record<string, unknown> } });
    if (res) version = res.version;
  };

  const flush = () => {
    if (applying) return;
    const current = snapshot(getDB());
    const now = fingerprint(current);
    const patch: Doc = {};
    for (const key of SHARED_KEYS) if (now[key] !== last[key]) patch[key] = current[key];
    if (Object.keys(patch).length === 0) return;
    last = now;
    void push(patch).catch(() => undefined);
  };

  const unsubscribe = subscribe(() => {
    if (applying) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flush, PUSH_DEBOUNCE_MS);
  });

  void pull().catch(() => undefined);

  const timer = setInterval(() => {
    if (stopped || document.hidden) return;
    void pullSharedVersion()
      .then(async (v) => {
        if (v !== null && v !== version) await pull();
      })
      .catch(() => undefined);
  }, POLL_MS);

  const onVisible = () => {
    if (!document.hidden) void pull().catch(() => undefined);
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    clearInterval(timer);
    if (pushTimer) clearTimeout(pushTimer);
    document.removeEventListener("visibilitychange", onVisible);

    unsubscribe();
  };
}
