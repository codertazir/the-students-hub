import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { EMAIL_DOMAIN, normalizeEmail } from "@/lib/store";

export const Route = createFileRoute("/log-in")({
  head: () => ({
    meta: [
      { title: "Sign in — The Students Hub" },
      { name: "description", content: "Sign in to The Students Hub with your school email to reach the club dashboard." },
      { property: "og:title", content: "Sign in — The Students Hub" },
      { property: "og:description", content: "Sign in with your school email to reach the club dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [local, setLocal] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/home" });
  }, [user, navigate]);

  const email = normalizeEmail(local);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Enter your school email address.");
      return;
    }
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }
    setBusy(true);
    try {
      const { created } = await signIn(email, password);
      toast.success(created ? "Account created — welcome to the hub." : "Welcome back.");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <div className="surface-card rise-in p-7">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New members get an account automatically.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">School email</Label>
              <div className="flex items-center overflow-hidden rounded-lg border border-input bg-background transition-shadow focus-within:ring-2 focus-within:ring-ring/40">
                <input
                  id="email"
                  autoComplete="username"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="School email"
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                />
                <span className="shrink-0 border-l border-input bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  {EMAIL_DOMAIN}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Signing in as <span className="font-medium text-foreground">{email || `you${EMAIL_DOMAIN}`}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Signing in…" : "Continue"}
            </Button>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              By logging in, you agree to the{" "}
              <Link
                to="/terms"
                className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
              >
                Terms and Conditions
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}