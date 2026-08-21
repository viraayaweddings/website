"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { clearRateLimit, isRateLimited, recordRateLimitAttempt } from "@/worker/admin/rate-limit";
import { verifyPassword } from "@/worker/admin/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/worker/admin/session";
import { users } from "@/worker/db/schema";
import {
  isSecureRequest,
  LOGIN_PATH,
  recordAudit,
  requestContext,
  requireDb,
  safeReturnPath,
} from "../_lib/auth";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function failed(next: string, code: string): never {
  const params = new URLSearchParams({ error: code });
  if (next !== "/admin") params.set("next", next);
  redirect(`${LOGIN_PATH}?${params}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeReturnPath(String(formData.get("next") || "/admin"));

  if (!email || !password) failed(next, "missing");

  const context = await requestContext();
  const throttleKey = `${context.ip || "unknown"}:${email}`;
  const db = await requireDb();

  if (await isRateLimited(db, throttleKey, MAX_ATTEMPTS)) failed(next, "throttled");

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  // Hash even when the account is unknown so timing does not reveal it.
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

  if (!user || !passwordOk) {
    await recordRateLimitAttempt(db, throttleKey, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS);
    failed(next, "invalid");
  }
  if (user.status !== "active") {
    await recordRateLimitAttempt(db, throttleKey, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS);
    failed(next, "disabled");
  }

  await clearRateLimit(db, throttleKey);

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
