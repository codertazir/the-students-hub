/**
 * Local demo data layer for The Students Hub.
 *
 * NOTE: this build intentionally has no backend yet. Everything is persisted in
 * localStorage and synchronised across open tabs via the `storage` event, which
 * powers the "real-time" behaviour (presence, live typing, notifications).
 * Passwords are stored ONLY as salted SHA-256 hashes — never in plain text.
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
  area: "auth" | "notes" | "events" | "account";
  action: string;
  ts: number;
}

export interface Announcement {
  id: ID;
  title: string;
  body: string;
  pinned: boolean;
  ts: number;
}

export interface Task {
  id: ID;
  title: string;
  due: string;
  done: boolean;
  assignedTo: "all" | ID;
}

export interface NotificationItem {
  id: ID;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  cta?: { label: string; to: string };
}

export interface NoteResponse {
  id: ID;
  boxId: ID;
  userId: ID;
  authorName: string;
  anonymous: boolean;
  text: string;
  ts: number;
}

export interface NoteBox {
  id: ID;
  prompt: string;
  plainOnly: boolean;
}

export interface Note {
  id: ID;
  title: string;
  meetingDate: string;
  html: string;
  boxes: NoteBox[];
  responses: NoteResponse[];
}

export interface PollOption {
  id: ID;
  label: string;
  votes: ID[];
}

export interface EventComment {
  id: ID;
  userId: ID;
  authorName: string;
  text: string;
  kind: "comment" | "question";
  ts: number;
}

export interface EventFolder {
  id: ID;
  name: string;
  uploadsAllowed: boolean;
  files: { id: ID; name: string; by: string }[];
}

export interface ClubEvent {
  id: ID;
  title: string;
  date: string;
  location: string;
  notes: string;
  poll?: { question: string; options: PollOption[] };
  comments: EventComment[];
  folders: EventFolder[];
}

export interface Meeting {
  id: ID;
  title: string;
  date: string;
  time: string;
  room: string;
  agenda: string[];
}

export interface DB {
  users: User[];
  logins: LoginRecord[];
  activity: ActivityLog[];
  announcements: Announcement[];
  tasks: Task[];
  notifications: NotificationItem[];
  notes: Note[];
  events: ClubEvent[];
  meeting: Meeting;
  presence: Record<ID, number>;
  typing: Record<string, { name: string; ts: number }>;
  sessionUserId: ID | null;
}

const KEY = "tsh.db.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  return {
    users: [],
    logins: [],
    activity: [],
    announcements: [
      {
        id: uid(),
        title: "Club photo day moved to Sunday",
        body: "Bring your ID badge and wear the club hoodie. We meet at the main atrium at 8:15.",
        pinned: true,
        ts: Date.now() - 3600_000,
      },
      {
        id: uid(),
        title: "New note template for meetings",
        body: "Meeting notes now include response boxes — you can answer normally or anonymously.",
        pinned: true,
        ts: Date.now() - 86_400_000,
      },
    ],
    tasks: [
      { id: uid(), title: "Submit your event idea for the winter showcase", due: "Sun", done: false, assignedTo: "all" },
      { id: uid(), title: "Read the leadership handbook (pages 4-9)", due: "Tue", done: false, assignedTo: "all" },
      { id: uid(), title: "Confirm attendance for the community drive", due: "Thu", done: true, assignedTo: "all" },
    ],
    notifications: [
      {
        id: uid(),
        title: "Meeting notes are open",
        body: "This week's response boxes are live. Add your thoughts before Friday.",
        ts: Date.now() - 1800_000,
        read: false,
        cta: { label: "Open notes", to: "/notes" },
      },
      {
        id: uid(),
        title: "Vote on the showcase theme",
        body: "The poll closes on Sunday evening.",
        ts: Date.now() - 7200_000,
        read: false,
        cta: { label: "Go to events", to: "/events" },
      },
    ],
    notes: [
      {
        id: uid(),
        title: "Weekly meeting — planning the winter showcase",
        meetingDate: new Date().toISOString().slice(0, 10),
        html: "<h3>Agenda</h3><p>We reviewed the <strong>showcase budget</strong>, the volunteer rota and the <em>media team</em> hand-off.</p><ul><li>Budget approved at 4,000 SAR</li><li>Two volunteers still needed for setup</li><li>Posters due next Wednesday</li></ul>",
        boxes: [
          { id: "box-1", prompt: "What should we improve about our last event?", plainOnly: true },
          { id: "box-2", prompt: "Any concerns you'd rather raise privately?", plainOnly: true },
        ],
        responses: [],
      },
      {
        id: uid(),
        title: "Kick-off meeting — roles and expectations",
        meetingDate: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10),
        html: "<p>Introduced the committee, agreed on meeting cadence (every Sunday, 3rd period) and set up the notes workflow.</p>",
        boxes: [{ id: "box-3", prompt: "Which committee would you like to join?", plainOnly: true }],
        responses: [],
      },
    ],
    events: [
      {
        id: uid(),
        title: "Winter Showcase",
        date: new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10),
        location: "Main Hall",
        notes: "Doors open 17:00. Each committee gets a booth and a five minute stage slot.",
        poll: {
          question: "Which theme should we run with?",
          options: [
            { id: uid(), label: "Neon night", votes: [] },
            { id: uid(), label: "Retro arcade", votes: [] },
            { id: uid(), label: "Space station", votes: [] },
          ],
        },
        comments: [],
        folders: [
          { id: uid(), name: "Posters", uploadsAllowed: true, files: [] },
          { id: uid(), name: "Official photos", uploadsAllowed: false, files: [] },
        ],
      },
      {
        id: uid(),
        title: "Community Drive",
        date: new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10),
        location: "Sports Court",
        notes: "Collecting books and stationery for the partner school.",
        comments: [],
        folders: [{ id: uid(), name: "Sign-up sheets", uploadsAllowed: true, files: [] }],
      },
      {
        id: uid(),
        title: "Leadership Workshop",
        date: new Date(Date.now() + 34 * 86_400_000).toISOString().slice(0, 10),
        location: "Room B204",
        notes: "Guest speaker session on running student teams.",
        comments: [],
        folders: [],
      },
    ],
    meeting: {
      id: uid(),
      title: "Weekly club meeting",
      date: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
      time: "13:40 — 14:25",
      room: "Room B204",
      agenda: ["Showcase run-through", "Budget sign-off", "Volunteer rota", "Open floor"],
    },
    presence: {},
    typing: {},
    sessionUserId: null,
  };
}

let cache: DB | null = null;
const listeners = new Set<() => void>();

export function getDB(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = seed());
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as DB) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function setDB(mutate: (db: DB) => void) {
  const db = getDB();
  mutate(db);
  cache = { ...db };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* storage full — keep in-memory copy */
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

/** Placeholder client address: a real deployment records this server-side. */
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