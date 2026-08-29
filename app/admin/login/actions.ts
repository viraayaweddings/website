"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { clearRateLimit, isRateLimited, recordRateLimitAttempt } from "@/worker/admin/rate-limit";
import { decoyHash, verifyPassword } from "@/worker/admin/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/worker/admin/session";
import { users } from "@/worker/db/schema";
import { withFlashKey } from "../_lib/flash";
import {
  assertAdminRequest,
  isSecureRequest,
  LOGIN_PATH,
  recordAudit,
  requestContext,
  requireDb,
  safeReturnPath,
} from "../_lib/auth";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/**
 * A second, looser ceiling keyed on the account alone.
 *
 * The per-address limit only slows an attacker who keeps one address. This one
 * holds whatever they do with theirs, at a level a real person sharing an
 * office network will not reach.
 */
const ACCOUNT_WINDOW_MS = 60 * 60 * 1000;
const MAX_ACCOUNT_ATTEMPTS = 25;

function failed(next: string, code: string): never {
  const params = new URLSearchParams({ error: code });
  if (next !== "/admin") params.set("next", next);
  redirect(withFlashKey(`${LOGIN_PATH}?${params}`));
}

export async function loginAction(formData: FormData): Promise<void> {
  // A cross-site form post can otherwise sign someone into an account the
  // attacker controls and watch what they do in it.
  await assertAdminRequest(formData);

  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") || "");
  const next = safeReturnPath(String(formData.get("next") || "/admin"));

  if (!email || !password) failed(next, "missing");

  const context = await requestContext();
  const addressKey = `login:${context.ip || "unknown"}:${email}`;
  const accountKey = `login-account:${email}`;
  const db = await requireDb();

  if (
    (await isRateLimited(db, addressKey, MAX_ATTEMPTS)) ||
    (await isRateLimited(db, accountKey, MAX_ACCOUNT_ATTEMPTS))
  ) {
    failed(next, "throttled");
  }

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  // Hash even when the account is unknown so timing does not reveal it. The
  // decoy is derived from the same iteration count as a real hash, so the two
  // paths cost the same; a stale hardcoded one used to make the unknown-account
  // path far cheaper and gave the staff list away.
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, await decoyHash());

  async function countAttempt(): Promise<void> {
    await recordRateLimitAttempt(db, addressKey, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS);
    await recordRateLimitAttempt(db, accountKey, MAX_ACCOUNT_ATTEMPTS, ACCOUNT_WINDOW_MS);
  }

  if (!user || !passwordOk) {
    await countAttempt();
    failed(next, "invalid");
  }
  if (user.status !== "active") {
    await countAttempt();
    failed(next, "disabled");
  }

  await clearRateLimit(db, addressKey);
  await clearRateLimit(db, accountKey);

  const token = await createSession(db, user, context);

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .catch(() => undefined);
  await recordAudit(db, user, "user.login", "user", user.id, {});

  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(await isSecureRequest()));

  redirect(next);
}
