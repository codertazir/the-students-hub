import { useSession } from "@tanstack/react-start/server";

export interface SessionData {
  userId?: string;
}

function config() {
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
