"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "@/worker/admin/password";
import {
  createSession,
  destroyUserSessions,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/worker/admin/session";
import { clearRateLimit, isRateLimited, recordRateLimitAttempt } from "@/worker/admin/rate-limit";
import { users } from "@/worker/db/schema";
import {
  assertAdminRequest,
  isSecureRequest,
  recordAudit,
  requestContext,
  requireDb,
  requireUser,
} from "../_lib/auth";
import { withFlashKey } from "../_lib/flash";

const ACCOUNT_PATH = "/admin/account";
const MAX_NAME_LENGTH = 120;

/** Someone who has the screen open still has to know the current password. */
const WRONG_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const MAX_WRONG_PASSWORDS = 6;

function failed(message: string): never {
  redirect(withFlashKey(`${ACCOUNT_PATH}?error=${encodeURIComponent(message)}`));
}

function done(message: string): never {
  redirect(withFlashKey(`${ACCOUNT_PATH}?saved=${encodeURIComponent(message)}`));
}

/**
 * Changes the signed-in user's own password.
 *
 * Until now the only way a password changed was an admin resetting it, which
 * meant an editor who thought theirs was compromised had to find an admin, say
 * a new password out loud, and trust them with it -- and an admin who forgot
 * theirs needed someone in the database. Re-entering the current password is
 * what makes this safe to expose to every role: a borrowed unlocked laptop
 * cannot be used to lock the owner out.
 */
export async function changeOwnPasswordAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const user = await requireUser(ACCOUNT_PATH);
  const db = await requireDb();

  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  const throttleKey = `password-change:${user.id}`;
  if (await isRateLimited(db, throttleKey, MAX_WRONG_PASSWORDS)) {
    failed("Too many attempts. Wait a few minutes and try again.");
  }

  if (!current || !next) failed("Enter your current password and the new one.");
  if (next !== confirm) failed("The two new passwords do not match.");

  const weak = validatePasswordStrength(next);
  if (weak) failed(weak);

  if (!(await verifyPassword(current, user.passwordHash))) {
    await recordRateLimitAttempt(db, throttleKey, MAX_WRONG_PASSWORDS, WRONG_PASSWORD_WINDOW_MS);
    await recordAudit(db, user, "user.password_change_failed", "user", user.id, {});
    failed("That is not your current password.");
  }

  if (await verifyPassword(next, user.passwordHash)) {
    failed("That is the password you already have. Choose a different one.");
  }

  await clearRateLimit(db, throttleKey);

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Every other device signs out, then this one gets a fresh session so the
  // person who just changed their password is not signed out by their own
  // action.
  await destroyUserSessions(db, user.id);
  const token = await createSession(db, user, await requestContext());
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(await isSecureRequest()));

  await recordAudit(db, user, "user.password_changed", "user", user.id, { self: true });
  done("Password changed. Every other device has been signed out.");
}

/** Corrects the name shown beside your own entries in the activity log. */
export async function updateOwnProfileAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const user = await requireUser(ACCOUNT_PATH);
  const db = await requireDb();

  const name = String(formData.get("name") || "").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) failed("Enter your name.");
  if (name === user.name) done("That is already your name.");

  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, user.id));
  await recordAudit(db, user, "user.profile_updated", "user", user.id, {
    name: { from: user.name, to: name },
  });

  done("Name updated.");
}

/** Signs this account out everywhere, including the device asking. */
export async function signOutEverywhereAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const user = await requireUser(ACCOUNT_PATH);
  const db = await requireDb();

  await destroyUserSessions(db, user.id);
  await recordAudit(db, user, "user.sessions_cleared", "user", user.id, { self: true });

  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
