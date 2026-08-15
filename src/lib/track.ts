/**
 * Single entry point for the activity trail.
 *
 * Every meaningful user action calls `track(...)`. The server fills in the
 * person, IP address, browser, OS, device and user agent from the request, so
 * the admin Activity Log always reflects real, database-backed truth.
 */

import { logActivityRecord } from "./hub.functions";

export type TrackArea =
  | "auth"
  | "account"
  | "notes"
  | "events"
  | "tasks"
  | "admin"
  | "suggestions"
  | "announcements"
  | "polls"
  | "files"
  | "notifications";

export function track(
  area: TrackArea,
  action: string,
  detail?: string | null,
  metadata?: Record<string, unknown> | null,
) {
  if (typeof window === "undefined") return;
  void logActivityRecord({
    data: {
      area,
      action,
      detail: detail ?? null,
      metadata: metadata ? JSON.stringify(metadata).slice(0, 4000) : null,
    },
  }).catch(() => undefined);
}
