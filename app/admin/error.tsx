"use client";

import { isDatabaseError } from "./_lib/db-errors";

function isRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  if (digest.startsWith("NEXT_REDIRECT")) return true;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.includes("NEXT_REDIRECT");
}

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (isRedirectError(error)) throw error;

  /**
   * Fixed wording only.
   *
   * This used to fall through to `error.message`, and a postgres driver error
   * names the host, port and role it could not reach -- while a drizzle query
   * error puts the whole statement and its bound parameters there. /admin/health
   * already does the right thing -- full detail for a signed-in admin, a bare
   * status for anyone else -- so the detail is pointed at rather than printed.
   *
   * Classification is best-effort: in production Next replaces the message with
   * a generic string before this component ever sees it, leaving only `digest`.
   * The fallback wording is written to be right in that case too.
   */
  const message = isDatabaseError(error)
    ? "The admin panel cannot reach Postgres. In Vercel, confirm POSTGRES_URL is set for Production, redeploy, then open /admin/health to see the exact error."
    : "Something went wrong loading the admin panel. Open /admin/health for the details, or quote the reference below.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950">
        <h1 className="text-lg font-semibold">Admin unavailable</h1>
        <p className="mt-3 text-sm leading-6">{message}</p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs opacity-70">Reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
