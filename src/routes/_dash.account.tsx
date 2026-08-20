import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_dash/account")({
  head: () => ({
    meta: [
      { title: "Account — The Students Hub" },
      {
        name: "description",
        content: "Update your name, phone number, profile picture and password.",
      },
      { property: "og:title", content: "Account — The Students Hub" },
      { property: "og:description", content: "Update your profile details and password." },
    ],
  }),
  component: AccountPage,
});

/** Read-only field: email and date of birth can only be changed by an admin. */
function LockedField({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
        <Lock className="ml-auto size-3.5" />
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{value || "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function AccountPage() {
  const { user, updateUser, changePassword } = useAuth();
  const [name, setName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!user) return null;

  const dirty = name.trim() !== (user.fullName ?? "") || phone.trim() !== (user.phone ?? "");
  const passwordReady =
    oldPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="surface-card rise-in relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary-soft/70 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="size-20 shadow-lift ring-4 ring-background">
              {user.avatar && <AvatarImage src={user.avatar} alt="" />}
              <AvatarFallback className="bg-primary-soft text-lg text-accent-foreground">
                {(user.fullName || user.email).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label
              className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium shadow-sm transition-colors hover:bg-secondary"
              title="Upload a new profile picture"
            >
              Change
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2_000_000) {
                    toast.error("Please choose an image under 2 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateUser({ avatar: String(reader.result) });
                    toast.success("Profile picture updated.");
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {user.fullName || "Your account"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-accent-foreground">
                <ShieldCheck className="size-3.5" /> {user.isAdmin ? "Admin" : "Member"}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="surface-card rise-in p-6">
        <h2 className="text-sm font-semibold">Your details</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          You can update your name and phone number at any time.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="flex items-center gap-1.5">
              <UserIcon className="size-3.5" /> Full name
            </Label>
            <Input
              id="name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> Phone number
            </Label>
            <Input
              id="phone"
              value={phone}
              maxLength={40}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05x xxx xxxx"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <LockedField
            icon={<Mail className="size-3.5" />}
            label="Email address"
            value={user.email}
            note="Only an admin can change your email."
          />
          <LockedField
            icon={<Calendar className="size-3.5" />}
            label="Date of birth"
            value={user.dob}
            note="Set at sign-up. Contact an admin to correct it."
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button
            className="rounded-full"
            disabled={!dirty || saving || name.trim().length < 2}
            onClick={() => {
              setSaving(true);
              updateUser({ fullName: name.trim(), phone: phone.trim() });
              setSaving(false);
              toast.success("Details saved.");
            }}
          >
            <Check className="size-4" /> Save changes
          </Button>
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        </div>
      </section>

      <section className="surface-card rise-in p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Lock className="size-4" /> Change password
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirm your current password first. Passwords are stored only as secure hashes — never in
          plain text.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="old">Current password</Label>
            <Input
              id="old"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 transition-colors hover:bg-secondary"
            onClick={() => setReveal((v) => !v)}
          >
            {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {reveal ? "Hide" : "Show"} passwords
          </button>
          <span>Use at least 8 characters.</span>
          {newPassword.length > 0 &&
            confirmPassword.length > 0 &&
            newPassword !== confirmPassword && (
              <span className="text-destructive">New passwords do not match.</span>
            )}
        </div>
        <Button
          variant="outline"
          className="mt-4 rounded-full"
          disabled={!passwordReady}
          onClick={async () => {
            const ok = await changePassword(oldPassword, newPassword);
            if (!ok) {
              toast.error("Current password is incorrect.");
              return;
            }
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            toast.success("Password updated.");
          }}
        >
          Update password
        </Button>
      </section>
    </div>
  );
}
