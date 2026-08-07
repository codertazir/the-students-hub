import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_dash/account")({
  head: () => ({
    meta: [
      { title: "Account — The Students Hub" },
      { name: "description", content: "Update your name, phone number, profile picture and password." },
      { property: "og:title", content: "Account — The Students Hub" },
      { property: "og:description", content: "Update your profile details and password." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, updateUser, changePassword } = useAuth();
  const [name, setName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </header>

      <section className="surface-card p-6">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar className="size-16">
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback className="bg-primary-soft text-accent-foreground">
              {(user.fullName || user.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <label className="cursor-pointer rounded-full border border-input px-4 py-2 text-sm transition-colors hover:bg-secondary">
            Upload picture
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05x xxx xxxx" />
          </div>
        </div>
        <Button
          className="mt-4 rounded-full"
          onClick={() => {
            updateUser({ fullName: name.trim(), phone: phone.trim() });
            toast.success("Details saved.");
          }}
        >
          Save changes
        </Button>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-sm font-semibold">Change password</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          You must confirm your current password. Passwords are stored as salted hashes only.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="old">Current password</Label>
            <Input id="old" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-4 rounded-full"
          disabled={!oldPassword || newPassword.length < 4}
          onClick={async () => {
            const ok = await changePassword(oldPassword, newPassword);
            if (!ok) {
              toast.error("Current password is incorrect.");
              return;
            }
            setOldPassword("");
            setNewPassword("");
            toast.success("Password updated.");
          }}
        >
          Update password
        </Button>
      </section>
    </div>
  );
}