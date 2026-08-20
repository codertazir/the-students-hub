import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — The Students Hub" },
      {
        name: "description",
        content:
          "How The Students Hub handles member accounts, contributions, login metadata and privacy in plain language.",
      },
      { property: "og:title", content: "Terms and Conditions — The Students Hub" },
      {
        property: "og:description",
        content:
          "Plain-language terms covering accounts, contributions, login metadata and anonymous mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Who this website is for",
    body: [
      "The Students Hub is intended for members of the Students Hub club. Accounts are created for members so the club can organise notes, events, tasks and other shared work in one place.",
      "If you are not a member of the club, you should not create an account or use the hub.",
    ],
  },
  {
    title: "2. Why accounts exist",
    body: [
      "Your account is used to identify who submitted what. That includes notes, comments, poll and question responses, suggestions, tasks, projects and any other contribution you make.",
      "This keeps the hub organised and lets the club follow up with the right person about their work.",
    ],
  },
  {
    title: "3. Login and device information",
    body: [
      "When you sign in, sign out or change your password, the hub records information about that event. This can include the date and time, your IP address, your browser, your operating system, your device type and your full user agent string.",
      "This information is visible to authorised administrators and is used for administration, moderation, troubleshooting and security purposes only.",
    ],
  },
  {
    title: "4. Anonymous mode",
    body: [
      "Notes can be submitted in anonymous mode. Anonymous mode hides your identity from other members so they cannot see who wrote the note.",
      "Anonymous mode does not hide your identity from administrators. Administrators can always see which account created a note, including anonymous ones.",
    ],
  },
  {
    title: "5. Your password",
    body: [
      "You are responsible for keeping your password confidential and for any activity that happens under your account.",
      "The hub stores only club material, so passwords may be recoverable by authorised administrators for account support. Never reuse a password from your email, bank, or any other important account here.",
      "If you think someone else knows your password, change it from the Account page straight away and tell an administrator.",
    ],
  },
  {
    title: "6. Acceptable use",
    body: [
      "Keep contributions respectful and relevant to the club. Do not post content that is harmful, offensive, or that belongs to someone else without their permission.",
      "Administrators may edit or remove content and may restrict accounts that break these terms.",
    ],
  },
  {
    title: "7. Changes to these terms",
    body: [
      "These terms may be expanded as the hub evolves and new features are added. Continuing to use the hub after a change means you accept the updated terms.",
    ],
  },
];

function TermsPage() {
  return (
    <main className="min-h-screen bg-secondary/40 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to="/log-in"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <article className="surface-card rise-in p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
              <ScrollText className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Terms and Conditions
              </h1>
              <p className="text-sm text-muted-foreground">
                Plain language, no small print — here is how The Students Hub works.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-base font-semibold tracking-tight">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-10 rounded-2xl border border-border bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
            By signing in to The Students Hub you confirm that you have read and agree to these
            terms.
          </p>
        </article>
      </div>
    </main>
  );
}
