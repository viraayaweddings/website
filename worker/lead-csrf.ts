/**
 * The double-submit token the lead forms carry.
 *
 * Kept apart from lead-email.ts, which reaches the database and cannot be
 * imported by a plain node test. The endpoint that issues these is the one
 * piece of the lead path that had no App Router equivalent after the worker
 * entry was removed, so it is worth being able to test on its own.
 */
export const LEAD_CSRF_COOKIE = "lead_csrf";

/** One hour is longer than anyone spends on a form and short enough to expire. */
const MAX_AGE_SECONDS = 3600;

export function issueLeadCsrfToken(secure: boolean): { token: string; cookie: string } {
  const token = crypto.randomUUID();
  // Secure would stop the cookie ever being set over plain http, which is what
  // local development runs on.
  const flags = secure ? "; Secure" : "";
  return {
    token,
    cookie: `${LEAD_CSRF_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${flags}`,
  };
}

export function readLeadCsrfCookie(request: Request): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LEAD_CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}
