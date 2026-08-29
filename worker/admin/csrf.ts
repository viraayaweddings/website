/**
 * Double-submit CSRF for the admin panel (server runtime).
 */
import { cache } from "react";
import { cookies } from "next/headers";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_FIELD,
  adminCsrfTokensMatch,
} from "./csrf-tokens";

export {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_FIELD,
  ADMIN_CSRF_HEADER,
  assertAdminCsrfFromRequest,
  readAdminCsrfCookie,
} from "./csrf-tokens";

/** One hour — long enough for an edit session, short enough to limit reuse. */
const MAX_AGE_SECONDS = 3600;

const holder = cache((): { value: string } => ({ value: "" }));

/** Token for the current request, set by `primeAdminCsrf`. */
export function adminCsrfToken(): string {
  return holder().value;
}

export async function primeAdminCsrf(secure: boolean): Promise<void> {
  const store = await cookies();
  const existing = store.get(ADMIN_CSRF_COOKIE)?.value || "";

  if (existing) {
    holder().value = existing;
    return;
  }

  const issued = crypto.randomUUID();
  holder().value = issued;
  store.set(ADMIN_CSRF_COOKIE, issued, {
    path: "/admin",
    httpOnly: true,
    sameSite: "Strict",
    secure,
    maxAge: MAX_AGE_SECONDS,
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
