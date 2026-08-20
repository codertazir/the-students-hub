import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

/** Required first-login step: no close button, no skip. */
export function OnboardingDialog() {
  const { updateUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const valid = fullName.trim().length > 2 && dob !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-6 backdrop-blur-sm">
      <div className="surface-card rise-in w-full max-w-md p-7 shadow-lift">
        <h2 className="text-xl font-semibold tracking-tight">Finish setting up your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These two details are required before you can use the hub.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            updateUser({ fullName: fullName.trim(), dob, onboarded: true });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sara Al-Harbi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <Button type="submit" disabled={!valid} className="w-full rounded-full">
            Continue to the hub
          </Button>
        </form>
      </div>
    </div>
  );
}
