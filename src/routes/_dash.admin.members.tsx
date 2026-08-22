import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAuth } from "@/lib/auth";
import {
  AUTH_EVENT_LABEL,
  isOnline,
  useMonitoring,
  type MonitoredActivity,
  type MonitoredLogin,
  type MonitoredUser,
} from "@/lib/monitoring";
import {
  adminRemoveUser,
  adminUpdateDob,
  adminUpdateEmail,
  adminUpdateRole,
  adminViewPassword,
} from "@/lib/hub.functions";
import { ROLES, ROLE_LABEL, can, type Role } from "@/lib/permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dash/admin/members")({
  head: () => ({
    meta: [
      { title: "Members — Admin — The Students Hub" },
      { name: "description", content: "Manage club members, roles and view activity." },
      { property: "og:title", content: "Members — Admin" },
      { property: "og:description", content: "Search, promote and inspect member accounts." },
    ],
  }),
  component: MembersPage,
});

function initials(name: string, email: string) {
  const src = name || email;
  return (
    src
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?"
  );
}

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function MembersPage() {
  const { user } = useAuth();
  const isAdmin = can(user?.role, "manage:members");
  const { data, error } = useMonitoring(isAdmin);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busyRole, setBusyRole] = useState<string | null>(null);

  const members = data?.users ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    return members.filter((u) =>
      [u.name, u.preferredName, u.email, u.phoneNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [members, q]);

  if (!user) return null;
  if (!isAdmin)
    return (
      <AdminOnly
        title="Administrators only"
        description="Managing members is limited to full administrators."
      />
    );

  const detail = members.find((u) => u.id === selected) ?? null;

  const changeRole = async (target: MonitoredUser, next: Role) => {
    if (next === target.role) return;
    setBusyRole(target.id);
    try {
      const res = await adminUpdateRole({ data: { userId: target.id, role: next } });
      if (!res.ok) {
        toast.error("You cannot remove your own admin access.");
        return;
      }
      toast.success(`Role updated to ${ROLE_LABEL[next]}.`);
    } catch {
      toast.error("Could not update the role.");
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Search members, manage roles, and review individual activity."
      />

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email or phone…"
        className="max-w-sm"
      />

      <div className={cn("gap-5", detail ? "grid lg:grid-cols-[1.3fr_1fr]" : "block")}>
        <div className="surface-card rise-in overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Logins</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u.id === selected ? null : u.id)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage src={u.profilePicture ?? undefined} alt={u.displayName} />
                        <AvatarFallback>{initials(u.name, u.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.displayName || "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        u.role === "admin"
                          ? "bg-primary-soft text-accent-foreground"
                          : u.role === "manager"
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.dateOfBirth || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phoneNumber || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.loginCount}</td>
                  <td className="px-4 py-3">
                    {isOnline(u.lastActiveAt) ? (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <span className="size-2 rounded-full bg-primary" /> Online
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Offline</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={u.role}
                      disabled={busyRole === u.id}
                      onValueChange={(v) => void changeRole(u, v as Role)}
                    >
                      <SelectTrigger className="ml-auto h-8 w-[124px] rounded-full text-xs">
                        <ShieldCheck className="size-3.5 shrink-0" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                    {data ? "No members match your search." : "Loading members…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {detail && (
          <MemberDetail
            key={detail.id}
            currentUserId={user.id}
            onDeleted={() => setSelected(null)}
            member={detail}
            logins={(data?.logins ?? []).filter((l) => l.userId === detail.id)}
            activity={(data?.activity ?? []).filter((a) => a.userId === detail.id)}
          />
        )}
      </div>
    </div>
  );
}

function MemberDetail({
  member,
  logins,
  activity,
  currentUserId,
  onDeleted,
}: {
  member: MonitoredUser;
  logins: MonitoredLogin[];
  activity: MonitoredActivity[];
  currentUserId: string;
  onDeleted: () => void;
}) {
  const online = isOnline(member.lastActiveAt);

  const facts: { label: string; value: string }[] = [
    { label: "Full name", value: member.name || "—" },
    { label: "Preferred name", value: member.preferredName || "—" },
    { label: "Email", value: member.email },
    { label: "Phone number", value: member.phoneNumber || "—" },
    { label: "Date of birth", value: member.dateOfBirth || "—" },
    { label: "Role", value: ROLE_LABEL[member.role] },
    { label: "Date joined", value: new Date(member.createdAt).toLocaleDateString() },
    { label: "Account created", value: new Date(member.createdAt).toLocaleString() },
    { label: "Status", value: online ? "Online" : "Offline" },
    { label: "Last active", value: when(member.lastActiveAt) },
    { label: "Last sign-in", value: when(member.lastLoginAt) },
    { label: "Last activity", value: when(member.lastActivityAt) },
    { label: "Total logins", value: String(member.loginCount) },
    { label: "Total activities", value: String(member.activityCount) },
    { label: "Member ID", value: member.id },
  ];

  return (
    <aside className="surface-card rise-in h-fit space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Avatar className="size-14">
          <AvatarImage src={member.profilePicture ?? undefined} alt={member.displayName} />
          <AvatarFallback>{initials(member.name, member.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <UserCog className="size-4" /> {member.displayName || member.email}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          <span className={cn("text-xs", online ? "text-primary" : "text-muted-foreground")}>
            {online ? "Online now" : `Last active ${when(member.lastActiveAt)}`}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        {facts.map((f) => (
          <div key={f.label} className="rounded-xl bg-secondary/50 px-3 py-2">
            <dt className="text-[11px] uppercase text-muted-foreground">{f.label}</dt>
            <dd className="truncate font-medium" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <PasswordViewer key={`pw-${member.id}`} userId={member.id} />

      <EmailEditor key={member.id} userId={member.id} email={member.email} />

      <DobEditor
        key={`dob-${member.id}`}
        userId={member.id}
        dateOfBirth={member.dateOfBirth ?? ""}
      />

      {member.id !== currentUserId && (
        <DeleteMember
          userId={member.id}
          label={member.displayName || member.email}
          onDeleted={onDeleted}
        />
      )}

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Login history ({logins.length})
        </h3>
        <ul className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
          {logins.map((l) => (
            <li key={l.id} className="rounded-lg bg-secondary/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{AUTH_EVENT_LABEL[l.event] ?? l.event}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(l.timestamp).toLocaleString()}
                </span>
              </div>
              <span className="block text-xs text-muted-foreground">
                {[l.ipAddress, l.browser && l.os ? `${l.browser} on ${l.os}` : null, l.deviceType]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {l.detail && <span className="block text-xs text-muted-foreground">{l.detail}</span>}
            </li>
          ))}
          {logins.length === 0 && (
            <p className="text-xs text-muted-foreground">No logins recorded.</p>
          )}
        </ul>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Activity history ({activity.length})
        </h3>
        <ul className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
          {activity.map((a) => (
            <li key={a.id} className="rounded-lg bg-secondary/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{a.action}</span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(a.ts).toLocaleString()}
                </span>
              </div>
              <span className="block text-xs text-muted-foreground">
                {[
                  a.area,
                  a.detail,
                  a.ipAddress,
                  a.browser && a.os ? `${a.browser} on ${a.os}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
          {activity.length === 0 && (
            <p className="text-xs text-muted-foreground">No activity recorded.</p>
          )}
        </ul>
      </section>
    </aside>
  );
}

/**
 * Permanent account deletion.
 *
 * Two guards before anything is removed: the admin types DELETE and re-enters
 * their own password, which the server verifies before touching the database.
 */
function DeleteMember({
  userId,
  label,
  onDeleted,
}: {
  userId: string;
  label: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = phrase.trim().toUpperCase() === "DELETE" && password.length > 0;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await adminRemoveUser({ data: { userId, confirm: phrase, password } });
      if (!res.ok) {
        toast.error(
          res.reason === "password"
            ? "That is not your account password."
            : res.reason === "self"
              ? "You cannot delete your own account."
              : res.reason === "missing"
                ? "That account no longer exists."
                : "Type DELETE to confirm.",
        );
        return;
      }
      toast.success(`${label} was permanently deleted.`);
      setOpen(false);
      setPhrase("");
      setPassword("");
      onDeleted();
    } catch {
      toast.error("Could not delete this account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-destructive">
        <Trash2 className="size-3.5" /> Danger zone
      </h3>
      <p className="text-xs text-muted-foreground">
        Permanently removes this account. Club notes and events they created stay in the hub.
      </p>
      <Button
        size="sm"
        variant="destructive"
        className="w-full rounded-full"
        onClick={() => setOpen(true)}
      >
        Delete user
      </Button>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {label}?</DialogTitle>
            <DialogDescription>
              This is permanent. The account is removed from the database, from every member list
              and search, and they are signed out immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="confirm-phrase">
                Type DELETE to confirm
              </label>
              <Input
                id="confirm-phrase"
                value={phrase}
                autoComplete="off"
                placeholder="DELETE"
                onChange={(e) => setPhrase(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="confirm-pw">
                Your own account password
              </label>
              <Input
                id="confirm-pw"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={!ready || busy}
              onClick={() => void submit()}
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Admins can reveal a member's password — stored reversibly by club policy. */
function PasswordViewer({ userId }: { userId: string }) {
  const [password, setPassword] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    if (shown) {
      setShown(false);
      return;
    }
    if (password !== null) {
      setShown(true);
      return;
    }
    setBusy(true);
    try {
      const res = await adminViewPassword({ data: { userId } });
      if (!res.ok || !res.password) {
        toast.error("No recoverable password stored yet — it appears after their next sign-in.");
        return;
      }
      setPassword(res.password);
      setShown(true);
    } catch {
      toast.error("Could not read the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <KeyRound className="size-3.5" /> Password
      </h3>
      <p className="rounded-lg bg-background px-3 py-2 font-mono text-sm">
        {shown && password ? password : "••••••••"}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-full"
        disabled={busy}
        onClick={reveal}
      >
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {shown ? "Hide password" : busy ? "Checking…" : "Show password"}
      </Button>
    </div>
  );
}

/** Admins are the only ones who can change a member's email address. */
function EmailEditor({ userId, email }: { userId: string; email: string }) {
  const [value, setValue] = useState(email);
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  return (
    <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <Mail className="size-3.5" /> Email address
      </h3>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="member@example.com"
      />
      <Button
        size="sm"
        className="w-full rounded-full"
        disabled={!valid || busy || value.trim().toLowerCase() === email.toLowerCase()}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await adminUpdateEmail({ data: { userId, email: value.trim() } });
            if (!res.ok) {
              toast.error("That email is already used by another member.");
              return;
            }
            toast.success("Email updated.");
          } catch {
            toast.error("Could not update the email.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Save email
      </Button>
    </div>
  );
}

/** Only admins can correct a member's date of birth. */
function DobEditor({ userId, dateOfBirth }: { userId: string; dateOfBirth: string }) {
  const [value, setValue] = useState(dateOfBirth);
  const [busy, setBusy] = useState(false);
  const trimmed = value.trim();
  const parsed = trimmed ? new Date(trimmed) : null;
  const valid =
    !trimmed ||
    (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) &&
      parsed instanceof Date &&
      !Number.isNaN(parsed.getTime()) &&
      parsed.getTime() <= Date.now());

  return (
    <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <CalendarDays className="size-3.5" /> Date of birth
      </h3>
      <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
      {!valid && <p className="text-xs text-destructive">Enter a valid past date.</p>}
      <Button
        size="sm"
        className="w-full rounded-full"
        disabled={!valid || busy || trimmed === dateOfBirth}
        onClick={async () => {
          setBusy(true);
          try {
            await adminUpdateDob({ data: { userId, dateOfBirth: trimmed || null } });
            toast.success("Date of birth updated.");
          } catch {
            toast.error("Could not update the date of birth.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Save date of birth
      </Button>
    </div>
  );
}
