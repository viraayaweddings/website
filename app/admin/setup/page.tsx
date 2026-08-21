// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/worker/admin/password";
import { SubmitButton } from "../_components/FormControls";
import { Monogram } from "../_components/icons";
import { Alert, Card, Field } from "../_components/ui";
import { hasAnyUser, LOGIN_PATH, requireDb } from "../_lib/auth";
import { createFirstAdminAction } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Enter your name and email.",
  email: "Enter a valid email address.",
  mismatch: "The two passwords do not match.",
  weak: `Choose a stronger password: at least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`,
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const db = await requireDb();
  if (await hasAnyUser(db)) redirect(LOGIN_PATH);

  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3">
            <Monogram size={48} prominent />
          </span>
          <p className="vw-display text-xl" style={{ color: "var(--ink)" }}>
            Create the first admin
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            This page works once. After an account exists it redirects to sign in.
          </p>
        </div>

        <Card>
          {params.error ? (
            <div className="mb-4">
              <Alert tone="error">{ERRORS[params.error] || "Could not create the account."}</Alert>
            </div>
          ) : null}

          <form action={createFirstAdminAction} className="space-y-4">
            <Field label="Name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="username" />
            <Field
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`}
            />
            <Field
              label="Confirm password"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
            />
            <SubmitButton block size="lg" pendingLabel="Creating…">
              Create admin account
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
