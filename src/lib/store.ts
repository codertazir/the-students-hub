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
  preferredName?: string;
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
  ip?: string;
  device?: string;
  browser?: string;
  os?: string;
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
  /** How it was delivered — kept for the admin history view. */
  channel?: "announcement" | "notification" | "both";
  /** Who it was aimed at when it was sent. */
  targets?: "all" | ID[];
  /** Archived announcements stay in the admin history but leave the home page. */
  archived?: boolean;
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

/** Per-member reaction to a suggestion: completed it, or dismissed it. */
export type SuggestionMark = "completed" | "ignored";

/** suggestionId -> userId -> { state, ts } */
export type SuggestionState = Record<ID, Record<ID, { state: SuggestionMark; ts: number }>>;

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
  /**
   * For "input" blocks:
   * - "live"   — one shared text area everyone types into together (default)
   * - "submit" — each member writes their own answer and submits it
   */
  mode?: "live" | "submit";
  /** Placeholder shown inside the response box. */
  placeholder?: string;
  /** Submit-style blocks: allow editing an answer after it has been sent. */
  allowEditAfterSubmit?: boolean;
  /** Submit-style blocks: let members read everyone else's answers. */
  showAllSubmissions?: boolean;
  /** Submit-style blocks: collected answers. */
  submissions?: NoteSubmission[];
}

export interface NoteSubmission {
  id: ID;
  userId: ID;
  authorName: string;
  text: string;
  ts: number;
  anonymous?: boolean;
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

/** Cards the admin can reorder / hide on the member home page. */
export type HomeCardId =
  | "announcements"
  | "suggestions"
  | "meeting"
  | "tasks"
  | "notes"
  | "events"
  | "funds";

export interface HomeCard {
  id: HomeCardId;
  visible: boolean;
}

export const HOME_CARD_LABELS: Record<HomeCardId, string> = {
  announcements: "Announcements",
  suggestions: "Suggestions for you",
  meeting: "Next meeting",
  tasks: "Your tasks",
  notes: "Latest meeting notes",
  events: "Upcoming events",
  funds: "Club funds",
};

export const DEFAULT_HOME_CARDS: HomeCard[] = [
  { id: "announcements", visible: true },
  { id: "suggestions", visible: true },
  { id: "meeting", visible: true },
  { id: "tasks", visible: true },
  { id: "notes", visible: true },
  { id: "events", visible: true },
  { id: "funds", visible: true },
];

/* ---------------- master plan ---------------- */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** School year default: August first. Admin can reorder freely. */
export const DEFAULT_MONTH_ORDER = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];

export type PlanColumnId =
  | "name"
  | "description"
  | "tasks"
  | "progress"
  | "status"
  | "event"
  | "start"
  | "end"
  | "priority"
  | "owner";

export interface PlanColumn {
  id: PlanColumnId;
  visible: boolean;
}

export const PLAN_COLUMN_LABELS: Record<PlanColumnId, string> = {
  name: "Project / Event",
  description: "Description",
  tasks: "Tasks",
  progress: "Progress",
  status: "Status",
  event: "Event page",
  start: "Start date",
  end: "End date",
  priority: "Priority",
  owner: "Owner",
};

export const DEFAULT_PLAN_COLUMNS: PlanColumn[] = [
  { id: "name", visible: true },
  { id: "description", visible: true },
  { id: "tasks", visible: true },
  { id: "progress", visible: true },
  { id: "status", visible: true },
  { id: "event", visible: true },
  { id: "start", visible: true },
  { id: "end", visible: true },
  { id: "priority", visible: true },
  { id: "owner", visible: false },
];

export type PlanStatus = "planned" | "in_progress" | "blocked" | "done" | "cancelled";
export const PLAN_STATUSES: PlanStatus[] = ["planned", "in_progress", "blocked", "done", "cancelled"];
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export type PlanPriority = "low" | "medium" | "high" | "urgent";
export const PLAN_PRIORITIES: PlanPriority[] = ["low", "medium", "high", "urgent"];
export const PLAN_PRIORITY_LABELS: Record<PlanPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** One row of a month table. Extra fields can be added without migrations. */
export interface PlanProject {
  id: ID;
  /** 0 = January … 11 = December. */
  month: number;
  order: number;
  name: string;
  description: string;
  status: PlanStatus;
  priority: PlanPriority;
  /** 0–100; recomputed from tasks unless the admin overrides it. */
  progress: number;
  autoProgress: boolean;
  /** Linked Students Hub event id (see DB.events). */
  eventId?: ID | null;
  start: string;
  end: string;
  owner?: string;
  createdBy: ID | "system";
  createdAt: number;
  updatedAt: number;
}

export type PlanTaskStatus = "todo" | "in_progress" | "blocked" | "done";
export const PLAN_TASK_STATUSES: PlanTaskStatus[] = ["todo", "in_progress", "blocked", "done"];
export const PLAN_TASK_STATUS_LABELS: Record<PlanTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export interface PlanTaskEvent {
  ts: number;
  by: ID | "system";
  byName: string;
  action: string;
}

export interface PlanTask {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  /** "all" = everyone in the club, otherwise an explicit list of user ids. */
  assignees: "all" | ID[];
  due: string;
  priority: PlanPriority;
  status: PlanTaskStatus;
  done: boolean;
  createdBy: ID | "system";
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  completedBy?: ID;
  history: PlanTaskEvent[];
}

/** Top-level keys that live in the shared (cross-device) document. */
export const SHARED_KEYS = [
  "announcements",
  "suggestions",
  "suggestionState",
  "homeCards",
  "tasks",
  "notifications",
  "notes",
  "events",
  "meeting",
  "funds",
  "planMonths",
  "planColumns",
  "planProjects",
  "planTasks",
  "presence",
  "typing",
] as const;
export type SharedKey = (typeof SHARED_KEYS)[number];

export interface DB {
  users: User[];
  logins: LoginRecord[];
  activity: ActivityLog[];
  announcements: Announcement[];
  suggestions: Suggestion[];
  suggestionState: SuggestionState;
  homeCards: HomeCard[];
  tasks: Task[];
  notifications: NotificationItem[];
  notes: Note[];
  events: ClubEvent[];
  meeting: Meeting;
  funds: Funds;
  /** Admin-controlled month order for the Master Plan page. */
  planMonths: number[];
  planColumns: PlanColumn[];
  planProjects: PlanProject[];
  planTasks: PlanTask[];
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
    announcements: [],
    suggestions: [],
    suggestionState: {},
    homeCards: DEFAULT_HOME_CARDS.map((c) => ({ ...c })),
    tasks: [],
    notifications: [],
    notes: [],
    events: [],
    meeting: {
      id: uid(),
      title: "",
      date: "",
      time: "",
      room: "",
      agenda: [],
      note: "",
      visible: false,
    },
    funds: {
      total: 0,
      currency: "SAR",
      label: "Club funds",
      note: "",
      updatedAt: Date.now(),
    },

    planMonths: [...DEFAULT_MONTH_ORDER],
    planColumns: DEFAULT_PLAN_COLUMNS.map((c) => ({ ...c })),
    planProjects: [],
    planTasks: [],
    presence: {},
    typing: {},
    sessionUserId: null,
  };
}

let cache: DB | null = null;
const listeners = new Set<() => void>();

/** Keeps the saved card order but drops unknown ids and appends new ones. */
export function mergeHomeCards(saved?: HomeCard[]): HomeCard[] {
  const known = new Set(DEFAULT_HOME_CARDS.map((c) => c.id));
  const kept = (saved ?? []).filter((c) => c && known.has(c.id)).map((c) => ({ id: c.id, visible: c.visible !== false }));
  const seen = new Set(kept.map((c) => c.id));
  for (const c of DEFAULT_HOME_CARDS) if (!seen.has(c.id)) kept.push({ ...c });
  return kept;
}

/** Keeps the admin's month order, drops duplicates/junk, appends missing months. */
export function mergeMonths(saved?: number[]): number[] {
  const kept: number[] = [];
  for (const m of saved ?? []) {
    const n = Number(m);
    if (Number.isInteger(n) && n >= 0 && n <= 11 && !kept.includes(n)) kept.push(n);
  }
  for (const m of DEFAULT_MONTH_ORDER) if (!kept.includes(m)) kept.push(m);
  return kept;
}

/** Keeps the admin's column order/visibility, appends columns added later. */
export function mergePlanColumns(saved?: PlanColumn[]): PlanColumn[] {
  const known = new Set(DEFAULT_PLAN_COLUMNS.map((c) => c.id));
  const kept = (saved ?? [])
    .filter((c) => c && known.has(c.id))
    .map((c) => ({ id: c.id, visible: c.visible !== false }));
  const seen = new Set(kept.map((c) => c.id));
  for (const c of DEFAULT_PLAN_COLUMNS) if (!seen.has(c.id)) kept.push({ ...c });
  return kept;
}

function normalizeProject(p: Partial<PlanProject>, index: number): PlanProject {
  return {
    id: p.id ?? uid(),
    month: Number.isInteger(p.month) && p.month! >= 0 && p.month! <= 11 ? p.month! : 0,
    order: typeof p.order === "number" ? p.order : index,
    name: p.name ?? "Untitled project",
    description: p.description ?? "",
    status: PLAN_STATUSES.includes(p.status as PlanStatus) ? (p.status as PlanStatus) : "planned",
    priority: PLAN_PRIORITIES.includes(p.priority as PlanPriority) ? (p.priority as PlanPriority) : "medium",
    progress: typeof p.progress === "number" ? Math.max(0, Math.min(100, Math.round(p.progress))) : 0,
    autoProgress: p.autoProgress !== false,
    eventId: p.eventId ?? null,
    start: p.start ?? "",
    end: p.end ?? "",
    owner: p.owner ?? "",
    createdBy: p.createdBy ?? "system",
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? p.createdAt ?? Date.now(),
  };
}

function normalizeTask(t: Partial<PlanTask>): PlanTask {
  const done = t.done ?? t.status === "done";
  return {
    id: t.id ?? uid(),
    projectId: t.projectId ?? "",
    title: t.title ?? "Untitled task",
    description: t.description ?? "",
    assignees: t.assignees === "all" ? "all" : Array.isArray(t.assignees) ? t.assignees : [],
    due: t.due ?? "",
    priority: PLAN_PRIORITIES.includes(t.priority as PlanPriority) ? (t.priority as PlanPriority) : "medium",
    status: PLAN_TASK_STATUSES.includes(t.status as PlanTaskStatus)
      ? (t.status as PlanTaskStatus)
      : done
        ? "done"
        : "todo",
    done,
    createdBy: t.createdBy ?? "system",
    createdAt: t.createdAt ?? Date.now(),
    updatedAt: t.updatedAt ?? t.createdAt ?? Date.now(),
    ...(t.completedAt ? { completedAt: t.completedAt } : {}),
    ...(t.completedBy ? { completedBy: t.completedBy } : {}),
    history: Array.isArray(t.history) ? t.history : [],
  };
}

/** Fills in anything a stored (older) snapshot is missing. */
function normalize(db: Partial<DB>): DB {
  const base = seed();
  const merged: DB = { ...base, ...db } as DB;
  merged.users ??= [];
  merged.logins ??= [];
  merged.activity ??= [];
  merged.announcements ??= base.announcements;
  merged.suggestions ??= [];
  merged.suggestionState ??= {};
  merged.homeCards = mergeHomeCards(db.homeCards);
  merged.tasks ??= base.tasks;
  merged.notifications ??= [];
  merged.notes ??= base.notes;
  merged.events ??= base.events;
  merged.meeting = { ...base.meeting, ...(db.meeting ?? {}) };
  merged.funds = { ...base.funds, ...(db.funds ?? {}) };
  merged.planMonths = mergeMonths(db.planMonths);
  merged.planColumns = mergePlanColumns(db.planColumns);
  merged.planProjects = (db.planProjects ?? []).map((p, i) => normalizeProject(p, i));
  merged.planTasks = (db.planTasks ?? []).map((t) => normalizeTask(t));
  merged.presence ??= {};
  merged.typing ??= {};
  merged.notifications = merged.notifications.map((n) => ({ ...n, targets: n.targets ?? "all" }));
  merged.announcements = merged.announcements.map((a) => ({
    ...a,
    channel: a.channel ?? "announcement",
    targets: a.targets ?? "all",
    archived: a.archived ?? false,
  }));
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
    suggestionState: {},
    homeCards: DEFAULT_HOME_CARDS.map((c) => ({ ...c })),
    tasks: [],
    notifications: [],
    notes: [],
    events: [],
    planMonths: [...DEFAULT_MONTH_ORDER],
    planColumns: DEFAULT_PLAN_COLUMNS.map((c) => ({ ...c })),
    planProjects: [],
    planTasks: [],
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

/** Every suggestion aimed at this member, regardless of their reaction. */
export function targetedSuggestions(db: DB, userId: ID) {
  return db.suggestions.filter((s) => s.targets === "all" || s.targets.includes(userId));
}

export function suggestionMark(db: DB, suggestionId: ID, userId: ID) {
  return db.suggestionState[suggestionId]?.[userId]?.state ?? null;
}

/** Home page list: hides anything the member completed or ignored. */
export function visibleSuggestions(db: DB, userId: ID) {
  return targetedSuggestions(db, userId).filter((s) => !suggestionMark(db, s.id, userId));
}

export function setSuggestionMark(suggestionId: ID, userId: ID, state: SuggestionMark | null) {
  setDB((d) => {
    const row = (d.suggestionState[suggestionId] ??= {});
    if (state) row[userId] = { state, ts: Date.now() };
    else delete row[userId];
    const title = d.suggestions.find((s) => s.id === suggestionId)?.title ?? "a suggestion";
    if (typeof window !== "undefined" && state) {
      void import("./track").then(({ track }) =>
        track(
          "suggestions",
          `marked the suggestion "${title}" as ${state === "completed" ? "done" : "ignored"}`,
          null,
          { suggestionId },
        ),
      );
    }
  });
}


/** Admin breakdown for one suggestion card. */
export function suggestionStats(db: DB, s: Suggestion) {
  const audience = s.targets === "all" ? db.users.map((u) => u.id) : s.targets;
  const marks = db.suggestionState[s.id] ?? {};
  const completed = audience.filter((id) => marks[id]?.state === "completed");
  const ignored = audience.filter((id) => marks[id]?.state === "ignored");
  const pending = audience.filter((id) => !marks[id]);
  return { audience, completed, ignored, pending };
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
  // Persist it too, so history survives devices and shows the real IP/device.
  if (typeof window !== "undefined") {
    void import("./hub.functions")
      .then(({ logActivityRecord }) => logActivityRecord({ data: { area, action } }))
      .catch(() => undefined);
  }
}
