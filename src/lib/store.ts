/**
 * Local reactive data layer for The Students Hub.
 *
 * Persisted in localStorage and mirrored to PostgreSQL (see lib/auth.tsx) for
 * users, login logs, notes and events. Cross-tab sync via the `storage` event
 * powers the "live" behaviour (presence, collaborative typing, notifications).
 */

export const EMAIL_DOMAIN = "@isg.edu.sa";

export type ID = string;

export interface User {
  id: ID;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  dob: string;
  phone?: string;
  avatar?: string;
  isAdmin: boolean;
  createdAt: number;
  onboarded: boolean;
}

export interface LoginRecord {
  id: ID;
  userId: ID;
  email: string;
  ts: number;
  ip: string;
  device: string;
  browser: string;
  os: string;
  userAgent: string;
}

export interface ActivityLog {
  id: ID;
  userId: ID;
  email: string;
  area: "auth" | "notes" | "events" | "account" | "tasks" | "admin";
  action: string;
  ts: number;
}

/** Call to action shared by announcements, suggestions and notifications. */
export interface CTA {
  label: string;
  /** Internal route (starts with "/") or absolute URL. */
  to: string;
}

export interface Announcement {
  id: ID;
  title: string;
  body: string;
  ts: number;
  pinned: boolean;
  cta?: CTA;
}

export interface Suggestion {
  id: ID;
  title: string;
  body: string;
  cta?: CTA;
  /** "all" or an explicit list of user ids. */
  targets: "all" | ID[];
  ts: number;
}

export interface Task {
  id: ID;
  title: string;
  due: string;
  done: boolean;
  createdBy: ID | "system";
  /** "all" for club-wide tasks, otherwise the owner's user id. */
  assignedTo: "all" | ID;
  createdAt: number;
  completedAt?: number;
}

export interface NotificationItem {
  id: ID;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  /** "all" or a single recipient. */
  targets: "all" | ID[];
  cta?: CTA;
}

export interface Funds {
  total: number;
  currency: string;
  label: string;
  note: string;
  updatedAt: number;
}

export interface Meeting {
  id: ID;
  title: string;
  date: string;
  time: string;
  room: string;
  agenda: string[];
  note: string;
  visible: boolean;
}

/* ---------------- notes ---------------- */

export type NoteBlockKind = "heading" | "text" | "callout" | "divider" | "input";

export interface NoteBlock {
  id: ID;
  kind: NoteBlockKind;
  /** Admin-authored content (heading text, paragraph, callout, or input prompt). */
  content: string;
  /** For "input" blocks: the live shared answer everyone can see and edit. */
  shared?: string;
  lastEditor?: string;
  lastEditedAt?: number;
  /** For "input" blocks: allow anonymous contribution labels. */
  allowAnonymous?: boolean;
}

export interface Note {
  id: ID;
  /** Admin-set display number, e.g. 1 -> "#1". */
  number: number;
  title: string;
  /** Admin-set date and time label shown on the card. */
  dateLabel: string;
  meetingDate: string;
  /** Square preview: emoji + accent used for the visual header. */
  previewEmoji: string;
  previewAccent: string;
  blocks: NoteBlock[];
  createdAt: number;
}

/* ---------------- events ---------------- */

export interface PollOption {
  id: ID;
  label: string;
  votes: ID[];
}

export interface EventFile {
  id: ID;
  name: string;
  by: string;
  ts: number;
}

export type EventCardType = "poll" | "budget" | "stats" | "info" | "folder";

export interface EventCard {
  id: ID;
  type: EventCardType;
  title: string;
  visible: boolean;
  poll?: { question: string; options: PollOption[] };
  budget?: { total: number; currency: string; allocations: { id: ID; label: string; amount: number }[] };
  stats?: { id: ID; label: string; value: string }[];
  info?: { body: string };
  folder?: { uploadsAllowed: boolean; files: EventFile[] };
}

export interface EventComment {
  id: ID;
  userId: ID;
  authorName: string;
  text: string;
  kind: "comment" | "question";
  ts: number;
}

export interface ClubEvent {
  id: ID;
  number: number;
  title: string;
  dateLabel: string;
  date: string;
  location: string;
  previewEmoji: string;
  previewAccent: string;
  completed: boolean;
  /** Admin-authored left-hand content. */
  blocks: NoteBlock[];
  cards: EventCard[];
  comments: EventComment[];
  createdAt: number;
}

export interface DB {
  users: User[];
  logins: LoginRecord[];
  activity: ActivityLog[];
  announcements: Announcement[];
  suggestions: Suggestion[];
  tasks: Task[];
  notifications: NotificationItem[];
  notes: Note[];
  events: ClubEvent[];
  meeting: Meeting;
  funds: Funds;
  presence: Record<ID, number>;
  typing: Record<string, { name: string; ts: number }>;
  sessionUserId: ID | null;
}

const KEY = "tsh.db.v2";
export const ONLINE_WINDOW_MS = 45_000;

export const uid = () => Math.random().toString(36).slice(2, 10);

const day = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset * day).toISOString().slice(0, 10);
const pretty = (offset: number, time: string) =>
  `${new Date(Date.now() + offset * day).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${time}`;

const ACCENTS = ["#1d4ed8", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#0369a1"];
export const previewAccent = (i: number) => ACCENTS[i % ACCENTS.length]!;

export function seed(): DB {
  return {
    users: [],
    logins: [],
    activity: [],
    announcements: [
      {
        id: uid(),
        title: "Club photo day moved to Sunday",
        body: "Bring your ID badge and wear the club hoodie. We meet at the main atrium at 8:15.",
        ts: Date.now() - 3_600_000,
        pinned: true,
        cta: { label: "See events", to: "/events" },
      },
      {
        id: uid(),
        title: "New note template for meetings",
        body: "Meeting notes are collaborative now — type straight into the response areas.",
        ts: Date.now() - day,
        pinned: true,
      },
    ],
    suggestions: [],
    tasks: [
      {
        id: uid(),
        title: "Submit your event idea for the winter showcase",
        due: "Sunday",
        done: false,
        createdBy: "system",
        assignedTo: "all",
        createdAt: Date.now() - day,
      },
      {
        id: uid(),
        title: "Read the leadership handbook (pages 4–9)",
        due: "Tuesday",
        done: false,
        createdBy: "system",
        assignedTo: "all",
        createdAt: Date.now() - 2 * day,
      },
      {
        id: uid(),
        title: "Confirm attendance for the community drive",
        due: "Thursday",
        done: false,
        createdBy: "system",
        assignedTo: "all",
        createdAt: Date.now() - 3 * day,
      },
      {
        id: uid(),
        title: "Collect the poster printing quote",
        due: "Friday",
        done: true,
        createdBy: "system",
        assignedTo: "all",
        createdAt: Date.now() - 5 * day,
        completedAt: Date.now() - 4 * day,
      },
    ],
    notifications: [
      {
        id: uid(),
        title: "Meeting notes are open",
        body: "This week's response areas are live. Add your thoughts before Friday.",
        ts: Date.now() - 1_800_000,
        read: false,
        targets: "all",
        cta: { label: "Open notes", to: "/notes" },
      },
    ],
    notes: [
      {
        id: uid(),
        number: 2,
        title: "Planning the winter showcase",
        dateLabel: pretty(-1, "13:40"),
        meetingDate: iso(-1),
        previewEmoji: "❄️",
        previewAccent: ACCENTS[0]!,
        createdAt: Date.now() - day,
        blocks: [
          { id: uid(), kind: "heading", content: "Agenda" },
          {
            id: uid(),
            kind: "text",
            content:
              "We reviewed the showcase budget, the volunteer rota and the media team hand-off. Budget approved at 4,000 SAR; two volunteers still needed for setup.",
          },
          { id: uid(), kind: "callout", content: "Posters are due next Wednesday — send drafts to the media channel." },
          { id: uid(), kind: "divider", content: "" },
          {
            id: uid(),
            kind: "input",
            content: "What should we improve about our last event?",
            shared: "",
            allowAnonymous: true,
          },
        ],
      },
      {
        id: uid(),
        number: 1,
        title: "Kick-off — roles and expectations",
        dateLabel: pretty(-8, "13:40"),
        meetingDate: iso(-8),
        previewEmoji: "🚀",
        previewAccent: ACCENTS[1]!,
        createdAt: Date.now() - 8 * day,
        blocks: [
          { id: uid(), kind: "heading", content: "Welcome to the club" },
          {
            id: uid(),
            kind: "text",
            content:
              "Introduced the committee, agreed on meeting cadence (every Sunday, 3rd period) and set up the notes workflow.",
          },
          { id: uid(), kind: "input", content: "Which committee would you like to join?", shared: "", allowAnonymous: false },
        ],
      },
    ],
    events: [
      {
        id: uid(),
        number: 3,
        title: "Winter Showcase",
        dateLabel: pretty(9, "17:00"),
        date: iso(9),
        location: "Main Hall",
        previewEmoji: "🎭",
        previewAccent: ACCENTS[0]!,
        completed: false,
        createdAt: Date.now() - day,
        blocks: [
          { id: uid(), kind: "heading", content: "Run of show" },
          {
            id: uid(),
            kind: "text",
            content: "Doors open 17:00. Each committee gets a booth and a five minute stage slot.",
          },
          { id: uid(), kind: "input", content: "Which slot would your committee prefer?", shared: "", allowAnonymous: false },
        ],
        cards: [
          {
            id: uid(),
            type: "poll",
            title: "Theme vote",
            visible: true,
            poll: {
              question: "Which theme should we run with?",
              options: [
                { id: uid(), label: "Neon night", votes: [] },
                { id: uid(), label: "Retro arcade", votes: [] },
                { id: uid(), label: "Space station", votes: [] },
              ],
            },
          },
          {
            id: uid(),
            type: "budget",
            title: "Budget",
            visible: true,
            budget: {
              total: 4000,
              currency: "SAR",
              allocations: [
                { id: uid(), label: "Stage & lighting", amount: 1800 },
                { id: uid(), label: "Printing", amount: 700 },
                { id: uid(), label: "Refreshments", amount: 900 },
              ],
            },
          },
          {
            id: uid(),
            type: "stats",
            title: "At a glance",
            visible: true,
            stats: [
              { id: uid(), label: "Booths", value: "8" },
              { id: uid(), label: "Volunteers", value: "12" },
              { id: uid(), label: "Expected guests", value: "240" },
            ],
          },
          {
            id: uid(),
            type: "folder",
            title: "Posters",
            visible: true,
            folder: { uploadsAllowed: true, files: [] },
          },
        ],
        comments: [],
      },
      {
        id: uid(),
        number: 2,
        title: "Community Drive",
        dateLabel: pretty(20, "09:30"),
        date: iso(20),
        location: "Sports Court",
        previewEmoji: "📚",
        previewAccent: ACCENTS[1]!,
        completed: false,
        createdAt: Date.now() - 2 * day,
        blocks: [
          { id: uid(), kind: "text", content: "Collecting books and stationery for the partner school." },
        ],
        cards: [
          { id: uid(), type: "info", title: "Drop-off point", visible: true, info: { body: "Boxes are next to the library entrance all week." } },
          { id: uid(), type: "folder", title: "Sign-up sheets", visible: true, folder: { uploadsAllowed: true, files: [] } },
        ],
        comments: [],
      },
      {
        id: uid(),
        number: 1,
        title: "Leadership Workshop",
        dateLabel: pretty(-12, "14:10"),
        date: iso(-12),
        location: "Room B204",
        previewEmoji: "🎤",
        previewAccent: ACCENTS[2]!,
        completed: true,
        createdAt: Date.now() - 20 * day,
        blocks: [{ id: uid(), kind: "text", content: "Guest speaker session on running student teams." }],
        cards: [{ id: uid(), type: "stats", title: "Turnout", visible: true, stats: [{ id: uid(), label: "Attended", value: "31" }] }],
        comments: [],
      },
    ],
    meeting: {
      id: uid(),
      title: "Weekly club meeting",
      date: iso(2),
      time: "13:40 — 14:25",
      room: "Room B204",
      agenda: ["Showcase run-through", "Budget sign-off", "Volunteer rota", "Open floor"],
      note: "Bring your committee updates.",
      visible: true,
    },
    funds: {
      total: 12450,
      currency: "SAR",
      label: "Club funds",
      note: "Updated after the showcase sign-off.",
      updatedAt: Date.now(),
    },
    presence: {},
    typing: {},
    sessionUserId: null,
  };
}

let cache: DB | null = null;
const listeners = new Set<() => void>();

/** Fills in anything a stored (older) snapshot is missing. */
function normalize(db: Partial<DB>): DB {
  const base = seed();
  const merged: DB = { ...base, ...db } as DB;
  merged.users ??= [];
  merged.logins ??= [];
  merged.activity ??= [];
  merged.announcements ??= base.announcements;
  merged.suggestions ??= [];
  merged.tasks ??= base.tasks;
  merged.notifications ??= [];
  merged.notes ??= base.notes;
  merged.events ??= base.events;
  merged.meeting = { ...base.meeting, ...(db.meeting ?? {}) };
  merged.funds = { ...base.funds, ...(db.funds ?? {}) };
  merged.presence ??= {};
  merged.typing ??= {};
  merged.notifications = merged.notifications.map((n) => ({ ...n, targets: n.targets ?? "all" }));
  merged.notes = merged.notes.map((n, i) => ({
    ...n,
    number: n.number ?? i + 1,
    blocks: n.blocks ?? [],
    previewEmoji: n.previewEmoji ?? "📝",
    previewAccent: n.previewAccent ?? previewAccent(i),
    dateLabel: n.dateLabel ?? n.meetingDate ?? "",
    createdAt: n.createdAt ?? Date.now(),
  }));
  merged.events = merged.events.map((e, i) => ({
    ...e,
    number: e.number ?? i + 1,
    blocks: e.blocks ?? [],
    cards: e.cards ?? [],
    comments: e.comments ?? [],
    previewEmoji: e.previewEmoji ?? "🎉",
    previewAccent: e.previewAccent ?? previewAccent(i),
    dateLabel: e.dateLabel ?? e.date ?? "",
    completed: e.completed ?? false,
    createdAt: e.createdAt ?? Date.now(),
  }));
  return merged;
}

export function getDB(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = seed());
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? normalize(JSON.parse(raw) as Partial<DB>) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

/**
 * Deterministic, data-free snapshot used for the server render and the very
 * first client render. localStorage isn't available during SSR, so reading it
 * straight away caused a hydration mismatch that tripped the root error
 * boundary ("This page didn't load"). Components swap to the real store in an
 * effect right after mount.
 */
let ssrCache: DB | null = null;
export function ssrDB(): DB {
  if (ssrCache) return ssrCache;
  const base = seed();
  ssrCache = {
    ...base,
    users: [],
    logins: [],
    activity: [],
    announcements: [],
    suggestions: [],
    tasks: [],
    notifications: [],
    notes: [],
    events: [],
    presence: {},
    typing: {},
    sessionUserId: null,
  };
  return ssrCache;
}

export function setDB(mutate: (db: DB) => void) {
  const db = getDB();
  mutate(db);
  cache = { ...db };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* storage full — keep the in-memory copy */
    }
  }
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/* ---------------- derived helpers ---------------- */

export function visibleTasks(db: DB, userId: ID) {
  return db.tasks.filter((t) => t.assignedTo === "all" || t.assignedTo === userId || t.createdBy === userId);
}

export function visibleSuggestions(db: DB, userId: ID) {
  return db.suggestions.filter((s) => s.targets === "all" || s.targets.includes(userId));
}

export function visibleNotifications(db: DB, userId: ID) {
  return db.notifications.filter((n) => n.targets === "all" || n.targets.includes(userId));
}

export function notify(item: Omit<NotificationItem, "id" | "ts" | "read">) {
  setDB((d) => {
    d.notifications.unshift({ id: uid(), ts: Date.now(), read: false, ...item });
    d.notifications = d.notifications.slice(0, 80);
  });
}

export function userLabel(db: DB, id: ID) {
  const u = db.users.find((x) => x.id === id);
  return u?.fullName || u?.email || "Unknown member";
}

/* ---------------- security helpers ---------------- */

export function normalizeEmail(input: string) {
  const raw = input.trim().toLowerCase();
  const local = raw.replace(/@.*$/, "").replace(/[^a-z0-9._-]/g, "");
  return local ? local + EMAIL_DOMAIN : "";
}

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function makeSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function describeClient() {
  const ua = typeof navigator === "undefined" ? "unknown" : navigator.userAgent;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Unknown browser";
  const device = /iPad|Tablet/.test(ua) ? "Tablet" : /Mobi|Android|iPhone/.test(ua) ? "Phone" : "Desktop";
  return { ua, os, browser, device };
}

export async function lookupIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = (await res.json()) as { ip?: string };
    return json.ip ?? "unavailable";
  } catch {
    return "unavailable";
  }
}

export function logActivity(user: Pick<User, "id" | "email">, area: ActivityLog["area"], action: string) {
  setDB((db) => {
    db.activity.unshift({ id: uid(), userId: user.id, email: user.email, area, action, ts: Date.now() });
    db.activity = db.activity.slice(0, 200);
  });
}
