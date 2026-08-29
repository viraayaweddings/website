/**
 * Double-submit CSRF for the admin panel (server runtime).
 *
 * Cookies may only be written in Server Actions and Route Handlers — not in
 * layout or page renders. `loadAdminCsrf` is for layouts; `ensureAdminCsrfCookie`
 * is for server actions; `app/admin/csrf/route.ts` issues the first cookie.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_FIELD,
  adminCsrfTokensMatch,
  issueAdminCsrfToken,
} from "./csrf-tokens";

export {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_FIELD,
  ADMIN_CSRF_HEADER,
  assertAdminCsrfFromRequest,
  issueAdminCsrfToken,
  readAdminCsrfCookie,
} from "./csrf-tokens";

const holder = cache((): { value: string } => ({ value: "" }));

/** Token for the current request, set by `loadAdminCsrf` or `ensureAdminCsrfCookie`. */
export function adminCsrfToken(): string {
  return holder().value;
}

/** Read the existing cookie into the request cache. Safe in layouts. */
export async function loadAdminCsrf(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ADMIN_CSRF_COOKIE)?.value || "";
  holder().value = existing;
  return existing;
}

/** Issue or refresh the cookie. Only call from Server Actions. */
export async function ensureAdminCsrfCookie(secure: boolean): Promise<void> {
  const store = await cookies();
  const existing = store.get(ADMIN_CSRF_COOKIE)?.value || "";

  if (existing) {
    holder().value = existing;
    return;
  }

  const issued = issueAdminCsrfToken(secure);
  holder().value = issued.token;
  store.set(ADMIN_CSRF_COOKIE, issued.token, {
    path: "/admin",
    httpOnly: true,
    sameSite: "Strict",
    secure,
    maxAge: 3600,
  });
}

/** Validates a server-action form post. */
export async function assertAdminCsrfFromForm(formData: FormData): Promise<void> {
  const provided = String(formData.get(ADMIN_CSRF_FIELD) || "").trim();
  const store = await cookies();
  const expected = store.get(ADMIN_CSRF_COOKIE)?.value || "";
  if (!adminCsrfTokensMatch(provided, expected)) {
    throw new Error("Refused: your session expired. Refresh the page and try again.");
  }
}
