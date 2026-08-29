"use server";

import { redirect } from "next/navigation";
import { firstProtectionError, protectionError } from "@/worker/admin/protected-account";
import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { hashPassword, validatePasswordStrength } from "@/worker/admin/password";
import { destroyUserSessions } from "@/worker/admin/session";
import { sessions, users, USER_ROLES, type UserRole } from "@/worker/db/schema";
import { assertAdminRequest, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { isUniqueViolation } from "../_lib/db-errors";
import { withFlashKey } from "../_lib/flash";

const USERS_PATH = "/admin/users";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;

function failed(message: string): never {
  redirect(withFlashKey(`${USERS_PATH}?error=${encodeURIComponent(message)}`));
}

function done(message: string): never {
  redirect(withFlashKey(`${USERS_PATH}?saved=${encodeURIComponent(message)}`));
}

function readRole(formData: FormData): UserRole {
  const value = String(formData.get("role") || "editor");
  return (USER_ROLES as readonly string[]).includes(value) ? (value as UserRole) : "editor";
}

export async function createUserAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = readRole(formData);

  if (!name || !email) failed("Enter a name and email.");
  if (name.length > MAX_NAME_LENGTH) failed(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  if (email.length > MAX_EMAIL_LENGTH) failed(`Email must be ${MAX_EMAIL_LENGTH} characters or fewer.`);
  if (!EMAIL_PATTERN.test(email)) failed("Enter a valid email address.");

  const weak = validatePasswordStrength(password);
  if (weak) failed(weak);

  const id = crypto.randomUUID();

  // The unique index is the check, not a SELECT before the INSERT. Two admins
  // adding the same address at once both passed that check, and the loser threw
  // an unhandled constraint error into the crash page instead of saying the
  // address was taken.
  try {
    await db.insert(users).values({
      id,
      email,
      name,
      passwordHash: await hashPassword(password),
      role,
      status: "active",
    });
  } catch (error) {
    if (isUniqueViolation(error)) failed("An account with that email already exists.");
    throw error;
  }

  await recordAudit(db, actor, "user.created", "user", id, { email, role });
  done(`${email} can now sign in.`);
}

export async function updateUserAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = String(formData.get("id") || "");
  const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  if (!target) failed("That account no longer exists.");

  // Ownership first, before anything is read off the form: the protected
  // account is not editable by anyone else at all, so there is nothing to
  // validate.
  const blocked = protectionError(target, actor.id);
  if (blocked) failed(blocked);

  const role = readRole(formData);
  const status = String(formData.get("status") || "active") === "disabled" ? "disabled" : "active";

  // Name and email are editable now. A typo at account creation used to be
  // permanent, because nothing in the panel could change either one.
  const name = String(formData.get("name") || target.name).trim().slice(0, MAX_NAME_LENGTH) || target.name;
  const rawEmail = String(formData.get("email") || target.email).trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
  const email = rawEmail || target.email;
  if (!EMAIL_PATTERN.test(email)) failed("Enter a valid email address.");

  if (id === actor.id && (role !== target.role || status !== target.status)) {
    failed("You cannot change your own role or status. Ask another active admin to update your access.");
  }

  // Without this an admin can lock the whole team out of user management.
  if (target.role === "admin" && (role !== "admin" || status !== "active")) {
    const otherAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active"), ne(users.id, id)))
      .limit(1);
    if (!otherAdmins.length) failed("This is the last active admin. Promote someone else first.");
  }

  const unchanged =
    role === target.role && status === target.status && name === target.name && email === target.email;
  if (unchanged) done(`${target.email} is already up to date.`);

  try {
    await db.update(users).set({ role, status, name, email, updatedAt: new Date() }).where(eq(users.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) failed("Another account already uses that email address.");
    throw error;
  }

  // A disabled, demoted or renamed-address account should not keep an open
  // session: the address is the sign-in identity.
  if (status === "disabled" || role !== target.role || email !== target.email) {
    await destroyUserSessions(db, id);
  }

  await recordAudit(db, actor, "user.updated", "user", id, {
    email: { from: target.email, to: email },
    name: { from: target.name, to: name },
    role: { from: target.role, to: role },
    status: { from: target.status, to: status },
  });

  done(`${target.email} updated.`);
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");

  const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  if (!target) failed("That account no longer exists.");

  // The takeover route this whole flag exists for: reset the owner's password,
  // then sign in as them.
  const blocked = protectionError(target, actor.id);
  if (blocked) failed(blocked);

  const weak = validatePasswordStrength(password);
  if (weak) failed(weak);

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, id));

  // Force every device to sign in again with the new password.
  await destroyUserSessions(db, id);
  await recordAudit(db, actor, "user.password_reset", "user", id, { email: target.email });

  done(`Password reset for ${target.email}. They have been signed out everywhere.`);
}

/**
 * Removes an account. The last active admin cannot be deleted, and neither can
 * your own account, so nobody can lock themselves out.
 */
export async function deleteUserAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = String(formData.get("id") || "");
  if (id === actor.id) failed("You cannot delete the account you are signed in with.");

  const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  if (!target) failed("That account no longer exists.");

  const blocked = protectionError(target, actor.id);
  if (blocked) failed(blocked);

  if (target.role === "admin") {
    const otherAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active"), ne(users.id, id)))
      .limit(1);
    if (!otherAdmins.length) failed("This is the last active admin. Promote someone else first.");
  }

  // Sessions cascade with the row, but drop them explicitly so the intent is
  // obvious and any open session dies immediately. Both in one transaction, so
  // the account cannot survive its sessions being cleared or the reverse.
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.userId, id));
    await tx.delete(users).where(eq(users.id, id));
  });

  await recordAudit(db, actor, "user.deleted", "user", id, { email: target.email, role: target.role });
  done(`${target.email} deleted.`);
}

/** Deletes selected accounts without allowing self-delete or last-admin lockout. */
export async function bulkDeleteUsersAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();
  const selected = formData.getAll("ids").map((value) => String(value || "").trim()).filter(Boolean);
  const ids = [...new Set(selected)];

  if (!ids.length) failed("Select at least one account first.");
  if (ids.length > 200) failed("Select 200 accounts or fewer at a time.");
  if (ids.includes(actor.id)) failed("You cannot delete the account you are signed in with.");

  const targets = await db.select().from(users).where(inArray(users.id, ids));
  if (targets.length !== ids.length) failed("Some selected accounts no longer exist. Refresh and try again.");

  // Refuses the whole selection rather than quietly sparing the protected row:
  // a select-all delete that reported success while leaving one account behind
  // would read as the protection having failed.
  const blocked = firstProtectionError(targets, actor.id);
  if (blocked) failed(blocked);

  const deletingActiveAdmins = new Set(
    targets.filter((user) => user.role === "admin" && user.status === "active").map((user) => user.id),
  );
  if (deletingActiveAdmins.size > 0) {
    // Counted in SQL. Loading the first 200 admins and checking whether any
    // survived read wrong the moment there were more than 200 of them.
    const [{ remaining }] = await db
      .select({ remaining: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          eq(users.status, "active"),
          notInArray(users.id, [...deletingActiveAdmins]),
        ),
      );
    if (Number(remaining) === 0) {
      failed("This would delete the last active admin. Promote someone else first.");
    }
  }

  // One transaction: sessions destroyed but accounts left behind would sign
  // people out of accounts that still exist.
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(inArray(sessions.userId, ids));
    await tx.delete(users).where(inArray(users.id, ids));
  });

  await recordAudit(db, actor, "user.bulk_deleted", "user", ids.join(","), {
    count: ids.length,
    emails: targets.map((target) => target.email),
  });

  done(`${ids.length} account${ids.length === 1 ? "" : "s"} deleted.`);
}
