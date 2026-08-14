import { getPrisma } from "./db.server";
import { hashPassword, verifyPassword } from "./password.server";
import { getAppSession } from "./session.server";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  preferredName: string | null;
  profilePicture: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  role: "user" | "admin";
  createdAt: string;
  lastActiveAt: string | null;
}

export interface LoginMeta {
  ipAddress: string;
  device: string;
  deviceType: string;
  userAgent: string;
  browser: string;
  os: string;
}

/** Every authentication-related event we keep in the login log. */
export type AuthEvent =
  | "sign_in"
  | "sign_out"
  | "failed_login"
  | "password_change"
  | "account_created";

export interface SafeNote {
  id: string;
  title: string;
  content: string;
  date: string;
  anonymous: boolean;
  createdAt: string;
  createdById: string;
  authorName: string | null;
}

export interface SafeEvent {
  id: string;
  title: string;
  description: string;
  images: string[];
  date: string;
  location: string | null;
  createdAt: string;
  createdById: string;
}

export interface SafeLoginLog {
  id: string;
  email: string;
  name: string | null;
  event: AuthEvent;
  timestamp: string;
  ipAddress: string | null;
  device: string | null;
  deviceType: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  sessionId: string | null;
  detail: string | null;
  userId: string | null;
}

type DbUser = {
  id: string;
  email: string;
  name: string;
  preferredName: string | null;
  profilePicture: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  role: "user" | "admin";
  createdAt: Date;
  lastActiveAt: Date | null;
};

/** Strips password + any internals before anything crosses to the browser. */
function toSafeUser(user: DbUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    preferredName: user.preferredName,
    profilePicture: user.profilePicture,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
  };
}

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  preferredName: true,
  profilePicture: true,
  phoneNumber: true,
  dateOfBirth: true,
  role: true,
  createdAt: true,
  lastActiveAt: true,
} as const;

/** Dev-only bootstrap admin, supplied by env — never hard-coded credentials. */
function adminBootstrap() {
  return {
    email: process.env["ADMIN_EMAIL"] ?? "admin@isg.edu.sa",
    password: process.env["ADMIN_PASSWORD"] ?? "admin",
  };
}

/** Person-facing label used in every log line. */
function displayName(user: { name: string; preferredName?: string | null; email: string }) {
  return user.preferredName || user.name || user.email;
}

/** Writes one authentication event to the login log. */
async function writeAuthEvent(input: {
  event: AuthEvent;
  email: string;
  name?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  detail?: string | null;
  meta: LoginMeta;
}) {
  await getPrisma().loginLog.create({
    data: {
      email: input.email,
      name: input.name ?? null,
      event: input.event,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      detail: input.detail ?? null,
      ipAddress: input.meta.ipAddress,
      device: input.meta.device,
      deviceType: input.meta.deviceType,
      userAgent: input.meta.userAgent,
      browser: input.meta.browser,
      os: input.meta.os,
    },
  });
}

/** Internal activity writer used by the server when there is no client call. */
async function recordActivity(input: {
  user: SafeUser;
  area: string;
  action: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  meta?: Partial<LoginMeta>;
}) {
  await getPrisma().activityLog.create({
    data: {
      userId: input.user.id,
      email: input.user.email,
      name: displayName(input.user),
      area: input.area,
      action: input.action,
      detail: input.detail ?? null,
      metadata: (input.metadata ?? undefined) as never,
      ipAddress: input.meta?.ipAddress ?? null,
      device: input.meta?.device ?? null,
      deviceType: input.meta?.deviceType ?? null,
      userAgent: input.meta?.userAgent ?? null,
      browser: input.meta?.browser ?? null,
      os: input.meta?.os ?? null,
    },
  });
}

export async function signInUser(email: string, password: string, meta: LoginMeta) {
  const prisma = getPrisma();
  const boot = adminBootstrap();
  const isBootstrapAdmin = email === boot.email && password === boot.password;

  const existing = await prisma.user.findUnique({ where: { email } });
  let created = false;
  let user: DbUser;

  if (existing) {
    const ok = isBootstrapAdmin || (await verifyPassword(password, existing.password));
    if (!ok) {
      await writeAuthEvent({
        event: "failed_login",
        email,
        name: existing.preferredName || existing.name || null,
        userId: existing.id,
        detail: "Incorrect password",
        meta,
      });
      throw new Error("Incorrect password for this account.");
    }
    user = existing;
  } else {
    user = await prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        name: isBootstrapAdmin ? "Club Admin" : "",
        role: isBootstrapAdmin ? "admin" : "user",
      },
      select: safeUserSelect,
    });
    created = true;
  }

  const sessionId = crypto.randomUUID();
  const safe = toSafeUser(user);

  await writeAuthEvent({
    event: created ? "account_created" : "sign_in",
    email,
    name: displayName(safe),
    userId: user.id,
    sessionId,
    detail: `${meta.browser} on ${meta.os} (${meta.deviceType})`,
    meta,
  });
  await recordActivity({
    user: safe,
    area: "auth",
    action: created
      ? `${displayName(safe)} created an account and signed in`
      : `${displayName(safe)} signed in`,
    detail: `${meta.browser} on ${meta.os} · ${meta.ipAddress}`,
    metadata: { sessionId },
    meta,
  });

  const refreshed = await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
    select: safeUserSelect,
  });

  const session = await getAppSession();
  await session.update({ userId: user.id, sessionId });

  return { user: toSafeUser(refreshed), created };
}

export async function signOutUser(meta: LoginMeta) {
  const session = await getAppSession();
  const me = await currentUser();
  if (me) {
    await writeAuthEvent({
      event: "sign_out",
      email: me.email,
      name: displayName(me),
      userId: me.id,
      sessionId: session.data.sessionId ?? null,
      detail: "Signed out of this device",
      meta,
    });
    await recordActivity({
      user: me,
      area: "auth",
      action: `${displayName(me)} signed out`,
      detail: `${meta.browser} on ${meta.os} · ${meta.ipAddress}`,
      meta,
    });
  }
  await session.clear();
  return { ok: true };
}

export async function currentUser(): Promise<SafeUser | null> {
  const session = await getAppSession();
  const userId = session.data.userId;
  if (!userId) return null;
  const user = await getPrisma().user.findUnique({ where: { id: userId }, select: safeUserSelect });
  return user ? toSafeUser(user) : null;
}

/** Heartbeat: keeps the DB the source of truth for "last active"/online status. */
export async function touchPresence() {
  const me = await currentUser();
  if (!me) return { ok: false as const };
  await getPrisma().user.update({ where: { id: me.id }, data: { lastActiveAt: new Date() } });
  return { ok: true as const };
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Admins only.");
  return user;
}

export async function updateProfile(
  patch: {
    name?: string | undefined;
    preferredName?: string | null | undefined;
    phoneNumber?: string | null | undefined;
    profilePicture?: string | null | undefined;
    dateOfBirth?: string | null | undefined;
  },
  meta?: Partial<LoginMeta>,
) {
  const me = await requireUser();
  const data: Record<string, string | null> = {};
  if (patch.name !== undefined) data["name"] = patch.name;
  if (patch.preferredName !== undefined) data["preferredName"] = patch.preferredName;
  if (patch.phoneNumber !== undefined) data["phoneNumber"] = patch.phoneNumber;
  if (patch.profilePicture !== undefined) data["profilePicture"] = patch.profilePicture;
  if (patch.dateOfBirth !== undefined) data["dateOfBirth"] = patch.dateOfBirth;

  const prisma = getPrisma();
  const user = await prisma.user.update({
    where: { id: me.id },
    data: { ...data, lastActiveAt: new Date() },
    select: safeUserSelect,
  });
  const safe = toSafeUser(user);
  const who = displayName(safe);

  // One clear activity line per field that actually changed.
  const changes: { action: string; detail: string }[] = [];
  if (patch.name !== undefined && patch.name !== me.name)
    changes.push({
      action: `${who} changed their name to "${patch.name}"`,
      detail: `Previous name: ${me.name || "(empty)"}`,
    });
  if (patch.preferredName !== undefined && (patch.preferredName ?? "") !== (me.preferredName ?? ""))
    changes.push({
      action: `${who} updated their preferred name`,
      detail: `Now "${patch.preferredName || "(none)"}" · previously "${me.preferredName || "(none)"}"`,
    });
  if (patch.phoneNumber !== undefined && (patch.phoneNumber ?? "") !== (me.phoneNumber ?? ""))
    changes.push({
      action: `${who} updated their phone number`,
      detail: `Now ${patch.phoneNumber || "(none)"}`,
    });
  if (patch.profilePicture !== undefined && (patch.profilePicture ?? "") !== (me.profilePicture ?? ""))
    changes.push({
      action: patch.profilePicture
        ? `${who} updated their profile picture`
        : `${who} removed their profile picture`,
      detail: "Account → profile picture",
    });
  if (patch.dateOfBirth !== undefined && (patch.dateOfBirth ?? "") !== (me.dateOfBirth ?? ""))
    changes.push({
      action: `${who} set their date of birth`,
      detail: `Now ${patch.dateOfBirth || "(none)"}`,
    });

  for (const change of changes)
    await recordActivity({ user: safe, area: "account", ...change, ...(meta ? { meta } : {}) });

  return safe;
}

/** Admins may correct another member's email address. */
export async function adminSetEmail(userId: string, email: string) {
  const admin = await requireAdmin();
  const prisma = getPrisma();
  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash && clash.id !== userId) return { ok: false as const, reason: "taken" as const };
  const before = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { email },
    select: safeUserSelect,
  });
  const safe = toSafeUser(user);
  await recordActivity({
    user: admin,
    area: "admin",
    action: `${displayName(admin)} changed the email address of ${displayName(safe)} to ${email}`,
    detail: `Previous email: ${before?.email ?? "unknown"}`,
    metadata: { targetUserId: userId },
  });
  return { ok: true as const, user: safe };
}

export async function changePassword(
  oldPassword: string,
  nextPassword: string,
  meta?: LoginMeta,
) {
  const me = await requireUser();
  const prisma = getPrisma();
  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row) throw new Error("Account not found.");
  if (!(await verifyPassword(oldPassword, row.password))) {
    if (meta)
      await writeAuthEvent({
        event: "failed_login",
        email: me.email,
        name: displayName(me),
        userId: me.id,
        detail: "Password change rejected — current password incorrect",
        meta,
      });
    return { ok: false };
  }
  await prisma.user.update({ where: { id: me.id }, data: { password: await hashPassword(nextPassword) } });
  if (meta)
    await writeAuthEvent({
      event: "password_change",
      email: me.email,
      name: displayName(me),
      userId: me.id,
      detail: "Password updated from the account page",
      meta,
    });
  await recordActivity({
    user: me,
    area: "account",
    action: `${displayName(me)} changed their password`,
    detail: "Stored as a bcrypt hash — plain text is never kept",
    ...(meta ? { meta } : {}),
  });
  return { ok: true };
}

export async function listContent() {
  await requireUser();
  const prisma = getPrisma();
  const [notes, events] = await Promise.all([
    prisma.note.findMany({
      orderBy: { date: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    prisma.event.findMany({ orderBy: { date: "asc" } }),
  ]);

  return {
    notes: notes.map<SafeNote>((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      date: n.date.toISOString(),
      anonymous: n.anonymous,
      createdAt: n.createdAt.toISOString(),
      createdById: n.createdById,
      authorName: n.anonymous ? null : n.createdBy.name || n.createdBy.email,
    })),
    events: events.map<SafeEvent>((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      images: Array.isArray(e.images) ? (e.images as string[]) : [],
      date: e.date.toISOString(),
      location: e.location,
      createdAt: e.createdAt.toISOString(),
      createdById: e.createdById,
    })),
  };
}

function toSafeLogin(l: {
  id: string;
  email: string;
  name: string | null;
  event: string;
  timestamp: Date;
  ipAddress: string | null;
  device: string | null;
  deviceType: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  sessionId: string | null;
  detail: string | null;
  userId: string | null;
}): SafeLoginLog {
  return {
    id: l.id,
    email: l.email,
    name: l.name,
    event: (l.event as AuthEvent) ?? "sign_in",
    timestamp: l.timestamp.toISOString(),
    ipAddress: l.ipAddress,
    device: l.device,
    deviceType: l.deviceType,
    userAgent: l.userAgent,
    browser: l.browser,
    os: l.os,
    sessionId: l.sessionId,
    detail: l.detail,
    userId: l.userId,
  };
}

export async function listAdminData() {
  await requireAdmin();
  const prisma = getPrisma();
  const [users, logs] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: safeUserSelect }),
    prisma.loginLog.findMany({ orderBy: { timestamp: "desc" }, take: 200 }),
  ]);
  return { users: users.map(toSafeUser), logins: logs.map(toSafeLogin) };
}

/**
 * Everything the admin monitoring + member detail screens need, straight from
 * PostgreSQL. Polled by admins so the screens stay live without a refresh.
 */
export async function listMonitoring() {
  await requireAdmin();
  const prisma = getPrisma();
  const [users, logins, activity, loginGroups, activityGroups, notes, events] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: safeUserSelect }),
    prisma.loginLog.findMany({ orderBy: { timestamp: "desc" }, take: 500 }),
    prisma.activityLog.findMany({ orderBy: { timestamp: "desc" }, take: 500 }),
    prisma.loginLog.groupBy({ by: ["userId"], _count: { _all: true }, _max: { timestamp: true } }),
    prisma.activityLog.groupBy({ by: ["userId"], _count: { _all: true }, _max: { timestamp: true } }),
    prisma.note.count(),
    prisma.event.count(),
  ]);

  const loginStats = new Map(loginGroups.map((g) => [g.userId ?? "", g]));
  const activityStats = new Map(activityGroups.map((g) => [g.userId ?? "", g]));

  return {
    fetchedAt: new Date().toISOString(),
    counts: { notes, events },
    users: users.map((u) => {
      const safe = toSafeUser(u);
      const l = loginStats.get(u.id);
      const a = activityStats.get(u.id);
      return {
        ...safe,
        displayName: displayName(safe),
        loginCount: l?._count._all ?? 0,
        activityCount: a?._count._all ?? 0,
        lastLoginAt: l?._max.timestamp ? l._max.timestamp.toISOString() : null,
        lastActivityAt: a?._max.timestamp ? a._max.timestamp.toISOString() : null,
      };
    }),
    logins: logins.map(toSafeLogin),
    activity: activity.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      name: r.name,
      area: r.area,
      action: r.action,
      detail: r.detail,
      metadata: r.metadata == null ? null : JSON.stringify(r.metadata),
      ipAddress: r.ipAddress,
      device: r.device,
      deviceType: r.deviceType,
      userAgent: r.userAgent,
      browser: r.browser,
      os: r.os,
      ts: r.timestamp.toISOString(),
    })),
  };
}

export async function saveNote(input: {
  id?: string | undefined;
  title: string;
  content: string;
  date?: string | undefined;
  anonymous?: boolean | undefined;
}) {
  const me = await requireAdmin();
  const prisma = getPrisma();
  const data = {
    title: input.title,
    content: input.content,
    date: input.date ? new Date(input.date) : new Date(),
    anonymous: input.anonymous ?? false,
  };
  const note = input.id
    ? await prisma.note.upsert({
        where: { id: input.id },
        update: data,
        create: { ...data, id: input.id, createdById: me.id },
      })
    : await prisma.note.create({ data: { ...data, createdById: me.id } });
  return { id: note.id };
}

export async function deleteNote(id: string) {
  await requireAdmin();
  await getPrisma().note.deleteMany({ where: { id } });
  return { ok: true };
}

export async function saveEvent(input: {
  id?: string | undefined;
  title: string;
  description: string;
  images?: string[] | undefined;
  date?: string | undefined;
  location?: string | null | undefined;
}) {
  const me = await requireAdmin();
  const prisma = getPrisma();
  const data = {
    title: input.title,
    description: input.description,
    images: input.images ?? [],
    date: input.date ? new Date(input.date) : new Date(),
    location: input.location ?? null,
  };
  const event = input.id
    ? await prisma.event.upsert({
        where: { id: input.id },
        update: data,
        create: { ...data, id: input.id, createdById: me.id },
      })
    : await prisma.event.create({ data: { ...data, createdById: me.id } });
  return { id: event.id };
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  await getPrisma().event.deleteMany({ where: { id } });
  return { ok: true };
}

/* ---------------- shared realtime state ---------------- */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Json = { [key: string]: JsonValue };

/** Reads the single shared document every device syncs against. */
export async function readShared(): Promise<{ version: number; data: Json }> {
  await requireUser();
  const prisma = getPrisma();
  const row = await prisma.sharedState.findUnique({ where: { id: "hub" } });
  if (!row) return { version: 0, data: {} };
  return { version: row.version, data: (row.data as Json) ?? {} };
}

/** Cheap poll: just the version stamp, so clients only refetch on change. */
export async function readSharedVersion(): Promise<number> {
  await requireUser();
  const prisma = getPrisma();
  const row = await prisma.sharedState.findUnique({
    where: { id: "hub" },
    select: { version: true },
  });
  return row?.version ?? 0;
}

/** Shallow top-level merge so two devices editing different areas don't clash. */
export async function writeShared(patch: Json): Promise<{ version: number; data: Json }> {
  await requireUser();
  const prisma = getPrisma();
  const existing = await prisma.sharedState.findUnique({ where: { id: "hub" } });
  const merged = { ...((existing?.data as Json) ?? {}), ...patch };
  const row = await prisma.sharedState.upsert({
    where: { id: "hub" },
    update: { data: merged, version: { increment: 1 } },
    create: { id: "hub", data: merged, version: 1 },
  });
  return { version: row.version, data: (row.data as Json) ?? {} };
}

/* ---------------- activity trail ---------------- */

export async function writeActivity(input: {
  area: string;
  action: string;
  detail?: string | null;
  meta?: { ipAddress?: string; device?: string; browser?: string; os?: string };
}) {
  const me = await requireUser();
  const prisma = getPrisma();
  await prisma.activityLog.create({
    data: {
      userId: me.id,
      email: me.email,
      area: input.area,
      action: input.action,
      detail: input.detail ?? null,
      ipAddress: input.meta?.ipAddress ?? null,
      device: input.meta?.device ?? null,
      browser: input.meta?.browser ?? null,
      os: input.meta?.os ?? null,
    },
  });
  return { ok: true };
}

export async function listActivity(limit = 300) {
  const me = await requireUser();
  const prisma = getPrisma();
  const rows = await prisma.activityLog.findMany({
    where: me.role === "admin" ? {} : { userId: me.id },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    email: r.email,
    area: r.area,
    action: r.action,
    detail: r.detail,
    ipAddress: r.ipAddress,
    device: r.device,
    browser: r.browser,
    os: r.os,
    ts: r.timestamp.toISOString(),
  }));
}
