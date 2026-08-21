"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, validatePasswordStrength } from "@/worker/admin/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/worker/admin/session";
import { users } from "@/worker/db/schema";
import {
  hasAnyUser,
  isSecureRequest,
  LOGIN_PATH,
  recordAudit,
  requestContext,
  requireDb,
  SETUP_PATH,
} from "../_lib/auth";

function failed(code: string): never {
  redirect(`${SETUP_PATH}?error=${code}`);
}

/**
 * Creates the first admin account. Self-disables permanently once any user
 * exists, so this cannot be used to add accounts later.
 */
export async function createFirstAdminAction(formData: FormData): Promise<void> {
  const db = await requireDb();
  if (await hasAnyUser(db)) redirect(LOGIN_PATH);

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
    lastLoginAt: now,
  };

  try {
    await db.insert(users).values(user);
  } catch {
    // Almost certainly a concurrent setup that won the race.
    redirect(LOGIN_PATH);
  }

  await recordAudit(db, user, "user.created", "user", user.id, { role: "admin", firstAdmin: true });

  const token = await createSession(db, { ...user, createdAt: now, updatedAt: now }, await requestContext());
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(await isSecureRequest()));

  redirect("/admin");
}
