import { useSession } from "@tanstack/react-start/server";

export interface SessionData {
  userId?: string;
  /** Identifies this browser session in the login log. */
  sessionId?: string;
}

function config() {
  // Read inside the handler so it is evaluated in the request context.
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("SESSION_SECRET is not configured");
  return {
    password,
    name: "tsh-session",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export async function getAppSession() {
  return useSession<SessionData>(config());
}
