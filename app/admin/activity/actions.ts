"use server";

import { redirect } from "next/navigation";
import { eq, inArray, lt, sql } from "drizzle-orm";
import { auditLog } from "@/worker/db/schema";
import { assertSameOrigin, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { withFlashKey } from "../_lib/flash";
import { PRUNE_DAYS } from "./constants";

const ACTIVITY_PATH = "/admin/activity";
const BULK_LIMIT = 200;

function backTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith(ACTIVITY_PATH) && !raw.startsWith("//") ? raw : ACTIVITY_PATH;
}

function withMessage(target: string, key: "error" | "deleted" | "saved", message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`));
}

/**
 * Removes selected entries.
 *
 * The removal is itself written to the log, so the trail cannot be quietly
 * erased: a gap always has an entry beside it saying who made it.
 */
export async function bulkDeleteActivityAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const ids = [
    ...new Set(
      formData
        .getAll("ids")
        .map((value) => Number.parseInt(String(value), 10))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  if (!ids.length) withMessage(target, "error", "Select at least one entry first.");
  if (ids.length > BULK_LIMIT) withMessage(target, "error", `Delete ${BULK_LIMIT} entries or fewer at a time.`);

  const existing = await db.select({ id: auditLog.id }).from(auditLog).where(inArray(auditLog.id, ids));
  if (!existing.length) withMessage(target, "error", "Those entries have already been removed.");

  await db.delete(auditLog).where(inArray(auditLog.id, ids));
  await recordAudit(db, actor, "activity.bulk_deleted", "activity", ids.join(","), {
    count: existing.length,
  });

  withMessage(target, "deleted", `${existing.length} entr${existing.length === 1 ? "y" : "ies"} deleted.`);
}

/**
 * Drops everything older than a chosen retention window.
 *
 * This is the routine way the log is kept to a workable size; deleting rows one
 * by one is for the odd mistake, not for housekeeping.
 */
export async function pruneActivityAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const days = Number.parseInt(String(formData.get("days") || ""), 10);
  if (!(PRUNE_DAYS as readonly number[]).includes(days)) {
    withMessage(target, "error", "Choose one of the retention windows offered.");
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [counted] = await db
    .select({ total: sql<number>`count(*)` })
    .from(auditLog)
    .where(lt(auditLog.createdAt, cutoff));
  const total = Number(counted?.total ?? 0);

  if (total === 0) withMessage(target, "error", `Nothing in the log is older than ${days} days.`);

  await db.delete(auditLog).where(lt(auditLog.createdAt, cutoff));
  await recordAudit(db, actor, "activity.pruned", "activity", String(days), {
    olderThanDays: days,
    removed: total,
  });

  withMessage(target, "deleted", `${total} entr${total === 1 ? "y" : "ies"} older than ${days} days removed.`);
}

/** Deletes one entry, used by the row control. */
export async function deleteActivityEntryAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id) || id <= 0) withMessage(target, "error", "That entry could not be identified.");

  const existing = (await db.select().from(auditLog).where(eq(auditLog.id, id)).limit(1))[0];
  if (!existing) withMessage(target, "error", "That entry has already been removed.");

  await db.delete(auditLog).where(eq(auditLog.id, id));
  await recordAudit(db, actor, "activity.deleted", "activity", String(id), {
    was: existing.action,
  });

  withMessage(target, "deleted", "Entry deleted.");
}
