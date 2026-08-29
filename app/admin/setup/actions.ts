"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, validatePasswordStrength } from "@/worker/admin/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/worker/admin/session";
import { sql } from "drizzle-orm";
import { users } from "@/worker/db/schema";
import { withFlashKey } from "../_lib/flash";

/** Serialises concurrent first-run setups. Distinct from the migration lock. */
const SETUP_LOCK_KEY = 842_002;
import {
  assertAdminRequest,
  hasAnyUser,
  isSecureRequest,
  LOGIN_PATH,
  recordAudit,
  requestContext,
  requireDb,
  SETUP_PATH,
} from "../_lib/auth";

function failed(code: string): never {
  redirect(withFlashKey(`${SETUP_PATH}?error=${code}`));
}

/**
 * Creates the first admin account. Self-disables permanently once any user
 * exists, so this cannot be used to add accounts later.
 */
export async function createFirstAdminAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const db = await requireDb();
  if (await hasAnyUser(db)) redirect(LOGIN_PATH);

  // Everything below is read and validated before the lock is taken, so the
  // lock is held for one SELECT and one INSERT.

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!name || !email) failed("missing");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) failed("email");
  if (password !== confirm) failed("mismatch");

  const weak = validatePasswordStrength(password);
  if (weak) failed("weak");

  const now = new Date();
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: await hashPassword(password),
    role: "admin" as const,
    status: "active",
    // The first admin is the owner of the install, so it is protected from the
    // admins it goes on to create: no one else can rename, demote, disable,
    // delete or reset the password of this account. See
    // worker/admin/protected-account.ts.
    protected: 1,
    lastLoginAt: now,
  };

  /**
   * Check-and-insert under an advisory lock.
   *
   * `hasAnyUser` followed by an insert is not enough on its own: two setups
   * submitted at the same moment with *different* addresses both passed the
   * check and both succeeded, so a page that promises to work once created two
   * admin accounts. The unique index only ever covered the same-address case.
   */
  const claimed = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SETUP_LOCK_KEY})`);

    const existing = await tx.select({ id: users.id }).from(users).limit(1);
    if (existing.length) return false;

    await tx.insert(users).values(user);
    return true;
  });

  // Someone else finished setup first. Their account is the one that exists.
  if (!claimed) redirect(LOGIN_PATH);

  await recordAudit(db, user, "user.created", "user", user.id, { role: "admin", firstAdmin: true });

  const token = await createSession(db, { ...user, createdAt: now, updatedAt: now }, await requestContext());
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(await isSecureRequest()));

  redirect("/admin");
}
