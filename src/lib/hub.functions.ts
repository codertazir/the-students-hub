import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  changePassword,
  currentUser,
  deleteEvent,
  deleteNote,
  listAdminData,
  listContent,
  saveEvent,
  saveNote,
  signInUser,
  signOutUser,
  listActivity,
  readShared,
  readSharedVersion,
  updateProfile,
  writeActivity,
  writeShared,
} from "./hub.server";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credentials.parse(input))
  .handler(async ({ data }) => {
    const userAgent = getRequestHeader("user-agent") ?? "unknown";
    const ipAddress = getRequestIP({ xForwardedFor: true }) ?? "unavailable";
    const os = /Windows/.test(userAgent)
      ? "Windows"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /iPhone|iPad/.test(userAgent)
            ? "iOS"
            : /Linux/.test(userAgent)
              ? "Linux"
              : "Unknown OS";
    const browser = /Edg\//.test(userAgent)
      ? "Edge"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Unknown browser";
    const device = /iPad|Tablet/.test(userAgent)
      ? "Tablet"
      : /Mobi|Android|iPhone/.test(userAgent)
        ? "Phone"
        : "Desktop";

    return signInUser(data.email, data.password, { ipAddress, device, userAgent, browser, os });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => signOutUser());

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => currentUser());

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().max(120).optional(),
        phoneNumber: z.string().max(40).nullable().optional(),
        profilePicture: z.string().max(500_000).nullable().optional(),
        dateOfBirth: z.string().max(40).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => updateProfile(data));

export const setPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ oldPassword: z.string().min(1), nextPassword: z.string().min(4) }).parse(input),
  )
  .handler(async ({ data }) => changePassword(data.oldPassword, data.nextPassword));

export const adminUpdateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ userId: z.string().min(1), email: z.string().trim().email().max(255) })
      .parse(input),
  )
  .handler(async ({ data }) => adminSetEmail(data.userId, data.email.toLowerCase()));


export const getContent = createServerFn({ method: "GET" }).handler(async () => listContent());

export const getAdminData = createServerFn({ method: "GET" }).handler(async () => listAdminData());

export const upsertNote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        title: z.string().min(1).max(300),
        content: z.string().max(200_000),
        date: z.string().optional(),
        anonymous: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => saveNote(data));

export const removeNote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => deleteNote(data.id));

export const upsertEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        title: z.string().min(1).max(300),
        description: z.string().max(200_000),
        images: z.array(z.string()).optional(),
        date: z.string().optional(),
        location: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => saveEvent(data));

export const removeEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => deleteEvent(data.id));

/* ---------------- realtime shared state + activity ---------------- */

export const pullShared = createServerFn({ method: "GET" }).handler(async () => readShared());

export const pullSharedVersion = createServerFn({ method: "GET" }).handler(async () =>
  readSharedVersion(),
);

export const pushShared = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ patch: z.record(z.string(), z.unknown()) }).parse(input),
  )
  .handler(async ({ data }) => writeShared(data.patch as Parameters<typeof writeShared>[0]));

export const logActivityRecord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        area: z.string().max(40),
        action: z.string().max(300),
        detail: z.string().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userAgent = getRequestHeader("user-agent") ?? "unknown";
    const ipAddress = getRequestIP({ xForwardedFor: true }) ?? "unavailable";
    const os = /Windows/.test(userAgent)
      ? "Windows"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /iPhone|iPad/.test(userAgent)
            ? "iOS"
            : /Linux/.test(userAgent)
              ? "Linux"
              : "Unknown OS";
    const browser = /Edg\//.test(userAgent)
      ? "Edge"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Unknown browser";
    const device = /iPad|Tablet/.test(userAgent)
      ? "Tablet"
      : /Mobi|Android|iPhone/.test(userAgent)
        ? "Phone"
        : "Desktop";
    return writeActivity({
      area: data.area,
      action: data.action,
      detail: data.detail ?? null,
      meta: { ipAddress, device, browser, os },
    });
  });

export const getActivity = createServerFn({ method: "GET" }).handler(async () => listActivity());
