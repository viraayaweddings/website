/**
 * Persists public form submissions so the admin panel can show them.
 *
 * Storage is best-effort by design: a database problem must never stop a
 * visitor's enquiry from being sent, so every function here swallows its
 * errors after logging them.
 */
import { eq } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { leads } from "../db/schema";

export interface StoredLeadInput {
  formId: string;
  formName: string;
  pageUrl: string;
  contact: { name: string; email: string; phone: string };
  fields: Record<string, string>;
  metadata: Record<string, string>;
}

/** Returns the new lead id, or null when storage was unavailable or failed. */
export async function storeLead(env: DatabaseEnv, input: StoredLeadInput): Promise<number | null> {
  try {
    const db = await getDb(env);
    if (!db) return null;

    const inserted = await db
      .insert(leads)
      .values({
        formId: input.formId.slice(0, 120),
        formName: input.formName.slice(0, 120),
        pageUrl: input.pageUrl.slice(0, 500),
        name: input.contact.name.slice(0, 200),
        email: input.contact.email.slice(0, 200),
        phone: input.contact.phone.slice(0, 40),
        fields: JSON.stringify(input.fields),
        metadata: JSON.stringify(input.metadata),
      })
      .returning({ id: leads.id });

    return inserted[0]?.id ?? null;
  } catch (error) {
    console.error("[lead-store] insert failed", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Flags that the Resend notification for this lead went out. */
export async function markLeadEmailSent(env: DatabaseEnv, leadId: number): Promise<void> {
  try {
    const db = await getDb(env);
    if (!db) return;
    await db.update(leads).set({ emailSent: 1, updatedAt: new Date() }).where(eq(leads.id, leadId));
  } catch (error) {
    console.error("[lead-store] update failed", error instanceof Error ? error.message : error);
  }
}
