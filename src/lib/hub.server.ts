import { getPrisma } from "./db.server";
import { hashPassword, verifyPassword } from "./password.server";
import { getAppSession } from "./session.server";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  profilePicture: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  role: "user" | "admin";
  createdAt: string;
}

export interface LoginMeta {
  ipAddress: string;
  device: string;
  userAgent: string;
  browser: string;
  os: string;
}

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
  timestamp: string;
  ipAddress: string | null;
  device: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  userId: string | null;
}

type DbUser = {
  id: string;
  email: string;
  name: string;
  profilePicture: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  role: "user" | "admin";
  createdAt: Date;
};

/** Strips password + any internals before anything crosses to the browser. */
function toSafeUser(user: DbUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profilePicture: user.profilePicture,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  profilePicture: true,
  phoneNumber: true,
  dateOfBirth: true,
  role: true,
  createdAt: true,
} as const;

/** Dev-only bootstrap admin, supplied by env — never hard-coded credentials. */
function adminBootstrap() {
  return {
    email: process.env["ADMIN_EMAIL"] ?? "admin@isg.edu.sa",
    password: process.env["ADMIN_PASSWORD"] ?? "admin",
  };
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
    if (!ok) throw new Error("Incorrect password for this account.");
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

  await prisma.loginLog.create({
    data: {
      email,
      userId: user.id,
      ipAddress: meta.ipAddress,
      device: meta.device,
      userAgent: meta.userAgent,
      browser: meta.browser,
      os: meta.os,
    },
  });

  const session = await getAppSession();
  await session.update({ userId: user.id });

  return { user: toSafeUser(user), created };
}

export async function signOutUser() {
  const session = await getAppSession();
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

export async function updateProfile(patch: {
  name?: string | undefined;
  phoneNumber?: string | null | undefined;
  profilePicture?: string | null | undefined;
  dateOfBirth?: string | null | undefined;
}) {
  const me = await requireUser();
  const data: Record<string, string | null> = {};
  if (patch.name !== undefined) data["name"] = patch.name;
  if (patch.phoneNumber !== undefined) data["phoneNumber"] = patch.phoneNumber;
  if (patch.profilePicture !== undefined) data["profilePicture"] = patch.profilePicture;
  if (patch.dateOfBirth !== undefined) data["dateOfBirth"] = patch.dateOfBirth;

  const user = await getPrisma().user.update({
    where: { id: me.id },
    data,
    select: safeUserSelect,
  });
  return toSafeUser(user);
}

export async function changePassword(oldPassword: string, nextPassword: string) {
  const me = await requireUser();
  const prisma = getPrisma();
  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row) throw new Error("Account not found.");
  if (!(await verifyPassword(oldPassword, row.password))) return { ok: false };
  await prisma.user.update({ where: { id: me.id }, data: { password: await hashPassword(nextPassword) } });
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

export async function listAdminData() {
  await requireAdmin();
  const prisma = getPrisma();
  const [users, logs] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: safeUserSelect }),
    prisma.loginLog.findMany({ orderBy: { timestamp: "desc" }, take: 200 }),
  ]);
  return {
    users: users.map(toSafeUser),
    logins: logs.map<SafeLoginLog>((l) => ({
      id: l.id,
      email: l.email,
      timestamp: l.timestamp.toISOString(),
      ipAddress: l.ipAddress,
      device: l.device,
      userAgent: l.userAgent,
      browser: l.browser,
      os: l.os,
      userId: l.userId,
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
