// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { SubmitButton } from "../_components/FormControls";
import { Monogram } from "../_components/icons";
import { Alert, Card, Field } from "../_components/ui";
import { getCurrentUser, hasAnyUser, requireDb, safeReturnPath, SETUP_PATH } from "../_lib/auth";
import { loginAction } from "./actions";

/**
 * Fixed messages rather than the raw parameter: this page is reachable without
 * a session, so nothing from the URL should be printed back to the visitor.
 */
const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "That email and password combination did not match.",
  disabled: "This account has been disabled. Ask an admin to re-enable it.",
  throttled: "Too many attempts. Wait a few minutes and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);

  const db = await requireDb();
  if (!(await hasAnyUser(db))) redirect(SETUP_PATH);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3">
            <Monogram size={48} prominent />
          </span>
          <p className="vw-display text-xl" style={{ color: "var(--ink)" }}>
            Viraaya Weddings
          </p>
          <p className="vw-eyebrow mt-0.5">Admin panel</p>
        </div>

        <Card>
          {params.error ? (
            <div className="mb-4">
              <Alert tone="error">{ERRORS[params.error] || "Could not sign you in."}</Alert>
            </div>
          ) : null}

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Email" name="email" type="email" required autoComplete="username" />
            <Field label="Password" name="password" type="password" required autoComplete="current-password" />
            <SubmitButton block size="lg" pendingLabel="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--ink-faint)" }}>
          This area is not indexed and is limited to staff accounts.
        </p>
      </div>
    </div>
  );
}
