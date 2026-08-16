/**
 * Live admin monitoring feed.
 *
 * Polls the database-backed `getMonitoring` server function so the Monitoring
 * and Members screens always show real rows (members, login log, activity log)
 * and refresh themselves without the admin touching the page.
 */

import { useEffect, useState } from "react";
import { getMonitoring, getSessionUser } from "./hub.functions";
import { setDB } from "./store";

export type MonitoringData = Awaited<ReturnType<typeof getMonitoring>>;
export type MonitoredUser = MonitoringData["users"][number];
export type MonitoredLogin = MonitoringData["logins"][number];
export type MonitoredActivity = MonitoringData["activity"][number];

const POLL_MS = 4_000;

export const ONLINE_WINDOW_MS = 60_000;

export function isOnline(lastActiveAt: string | null) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;
}

export const AUTH_EVENT_LABEL: Record<string, string> = {
  sign_in: "Signed in",
  sign_out: "Signed out",
  failed_login: "Failed login",
  password_change: "Password changed",
  account_created: "Account created",
};

/** Polls the monitoring feed while the tab is visible. */
export function useMonitoring(enabled: boolean) {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const load = async () => {
      try {
        const next = await getMonitoring();
        if (alive) {
          setData(next);
          setError(null);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not load monitoring data.";
        if (!alive) return;
        // A stale browser session (expired or invalidated cookie) makes the
        // server reject the request even though the cached profile still looks
        // signed in. Re-check the real session and send the admin back to the
        // login screen instead of showing a dead-end error.
        if (/not signed in/i.test(message) || /admins only/i.test(message)) {
          const fresh = await getSessionUser().catch(() => null);
          if (!alive) return;
          if (!fresh) {
            setDB((d) => void (d.sessionUserId = null));
            setError("Your session expired. Please sign in again.");
            return;
          }
          setError("This page is only available to admins.");
          return;
        }
        setError(message);
      }
    };

    void load();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return { data, error };
}
