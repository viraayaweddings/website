/**
 * Proves that a toast came from this panel and not from a link someone was sent.
 *
 * The redirect messages travel in the query string -- `?saved=`, `?error=`,
 * `?deleted=` -- and the Toaster rendered whatever it found there. React
 * escapes it, so this was never XSS; it was a phishing surface. A link to
 * `/admin/users?error=Session expired, re-enter your password at ...` showed
 * the recipient an official-looking error inside their own admin panel. The
 * login page had always avoided this by mapping fixed error codes; nothing else
 * did, and there are 250 message call sites, most of them reached from
 * synchronous helpers that cannot await a cookie write.
 *
 * So the transport stays and the *provenance* is what changes. Each browser
 * holds a flash key in a cookie. Server actions append it to the redirect, and
 * the Toaster renders a message only when the two match. An attacker cannot set
 * a cookie on this origin, so a crafted link carries no key the reader's
 * browser will agree with, and the message is dropped.
 *
 * The key is not a secret and guards nothing but the toast, so the cookie is
 * readable by script: the Toaster has to compare it client-side.
 */
import { cache } from "react";
import { cookies } from "next/headers";

export const FLASH_COOKIE = "vw_flash_key";
export const FLASH_PARAM = "fk";

/** Request-scoped, so the synchronous redirect helpers can read it. */
const holder = cache((): { value: string } => ({ value: "" }));

/**
 * Loads this browser's flash key, issuing one if it has none.
 *
 * Called from `assertSameOrigin`, which already sits at the top of every server
 * action, so no individual action has to remember.
 */
export async function primeFlashKey(secure: boolean): Promise<void> {
  const store = await cookies();
  const existing = store.get(FLASH_COOKIE)?.value || "";

  if (existing) {
    holder().value = existing;
    return;
  }

  const issued = crypto.randomUUID();
  holder().value = issued;
  store.set(FLASH_COOKIE, issued, {
    path: "/admin",
    httpOnly: false,
    sameSite: "Lax",
    secure,
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** The key for this request, or "" before it has been primed. */
export function flashKey(): string {
  return holder().value;
}

/**
 * Appends the key to a redirect target that already carries a message.
 *
 * A target with no message is returned unchanged, so nothing gains a parameter
 * it has no use for.
 */
export function withFlashKey(target: string): string {
  if (!/[?&](error|saved|deleted)=/.test(target)) return target;

  const key = flashKey();
  if (!key) return target;

  return `${target}${target.includes("?") ? "&" : "?"}${FLASH_PARAM}=${encodeURIComponent(key)}`;
}
