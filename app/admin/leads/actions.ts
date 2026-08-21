"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { eq, inArray } from "drizzle-orm";
import { resendStoredLeadEmail } from "@/worker/lead-email";
import { leads, LEAD_STATUSES, type LeadStatus } from "@/worker/db/schema";
import { recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";

export async function updateLeadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect("/admin/leads");

  const requested = String(formData.get("status") || "");
  const status = (LEAD_STATUSES as readonly string[]).includes(requested)
    ? (requested as LeadStatus)
    : null;
  const notes = String(formData.get("notes") || "").slice(0, 5000);

  const existing = (await db.select().from(leads).where(eq(leads.id, id)).limit(1))[0];
  if (!existing) redirect("/admin/leads");

  await db
    .update(leads)
    .set({
      status: status ?? existing.status,
      notes,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id));

  // Only worth an audit entry when something actually moved.
  if (status && status !== existing.status) {
    await recordAudit(db, user, "lead.status_changed", "lead", id, {
      from: existing.status,
      to: status,
    });
  }
  if (notes !== existing.notes) {
    await recordAudit(db, user, "lead.notes_updated", "lead", id, {});
  }

  redirect(`/admin/leads/${id}?saved=1`);
}

/** Destructive, so admins only. */
export async function deleteLeadAction(formData: FormData): Promise<void> {
  const user = await requireRole("admin");
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect("/admin/leads");

  const existing = (await db.select().from(leads).where(eq(leads.id, id)).limit(1))[0];
  if (!existing) redirect("/admin/leads");

  await db.delete(leads).where(eq(leads.id, id));
  await recordAudit(db, user, "lead.deleted", "lead", id, {
    formName: existing.formName,
    name: existing.name,
    email: existing.email,
  });

  redirect("/admin/leads?deleted=1");
}

/** Ids arrive as repeated `ids` checkboxes, one per selected row. */
function readIds(formData: FormData): number[] {
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)].slice(0, 200);
}

/** Where to send the user back to, preserving their filters and page. */
function backTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith("/admin/leads") && !raw.startsWith("//") ? raw : "/admin/leads";
}

/**
 * Applies one status to every selected submission, so a batch of spam or a
 * morning's replies can be cleared in one pass rather than one at a time.
 */
export async function bulkStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = await requireDb();
  const target = backTo(formData);

  const ids = readIds(formData);
  const requested = String(formData.get("bulkStatus") || "");
  if (!ids.length) redirect(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent("Select at least one submission first.")}`);
  if (!(LEAD_STATUSES as readonly string[]).includes(requested)) redirect(target);

  const status = requested as LeadStatus;
  const existing = await db.select({ id: leads.id }).from(leads).where(inArray(leads.id, ids));
  if (existing.length !== ids.length) {
    redirect(
      `${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent("Some selected submissions no longer exist. Refresh and try again.")}`,
    );
  }

  await db.update(leads).set({ status, updatedAt: new Date() }).where(inArray(leads.id, ids));
  await recordAudit(db, user, "lead.bulk_status", "lead", ids.join(","), { to: status, count: ids.length });

  const message = `${ids.length} submission${ids.length === 1 ? "" : "s"} marked ${status}.`;
  redirect(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`);
}

/** Destructive, so admins only — consistent with the single-row delete. */
export async function bulkDeleteAction(formData: FormData): Promise<void> {
  const user = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const ids = readIds(formData);
  if (!ids.length) redirect(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent("Select at least one submission first.")}`);

  const existing = await db.select({ id: leads.id }).from(leads).where(inArray(leads.id, ids));
  if (existing.length !== ids.length) {
    redirect(
      `${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent("Some selected submissions no longer exist. Refresh and try again.")}`,
    );
  }

  await db.delete(leads).where(inArray(leads.id, ids));
  await recordAudit(db, user, "lead.bulk_deleted", "lead", ids.join(","), { count: ids.length });

  const message = `${ids.length} submission${ids.length === 1 ? "" : "s"} deleted.`;
  redirect(`${target}${target.includes("?") ? "&" : "?"}deleted=${encodeURIComponent(message)}`);
}

/**
 * Sends the notification for an enquiry again.
 *
 * The dashboard counts enquiries whose alert never went out, which until now
 * was a figure nobody could act on: the enquiry was safely stored but the team
 * had no way to be told about it a second time.
 */
export async function resendLeadEmailAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect("/admin/leads");

  const lead = (await db.select().from(leads).where(eq(leads.id, id)).limit(1))[0];
  if (!lead) redirect("/admin/leads");

  const result = await resendStoredLeadEmail(emptyEnv(), {
    formId: lead.formId,
    formName: lead.formName,
    pageUrl: lead.pageUrl,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    fields: lead.fields,
    metadata: lead.metadata,
  });

  if (!result.ok) {
    await recordAudit(db, user, "lead.email_resend_failed", "lead", id, { error: result.error ?? "" });
    redirect(`/admin/leads/${id}?error=${encodeURIComponent(result.error || "The email could not be sent.")}`);
  }

  await db.update(leads).set({ emailSent: 1, updatedAt: new Date() }).where(eq(leads.id, id));
  await recordAudit(db, user, "lead.email_resent", "lead", id, {});

  redirect(`/admin/leads/${id}?saved=${encodeURIComponent("Notification email sent.")}`);
}
