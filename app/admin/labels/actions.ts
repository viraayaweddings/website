"use server";

import { redirect } from "next/navigation";
import { LABEL_DEFINITIONS, writeLabels } from "@/worker/site/labels";
import { invalidateTemplateCache } from "@/worker/site/template";
import { assertSameOrigin, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

const LABELS_PATH = "/admin/labels";
const MAX_LABEL_LENGTH = 200;

function failed(message: string): never {
  redirect(withFlashKey(`${LABELS_PATH}?error=${encodeURIComponent(message)}`));
}

/** Wording is site-wide, so editing it is an admin-only action. */
export async function saveLabelsAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const patch = LABEL_DEFINITIONS.map((definition) => {
    const value = String(formData.get(`value_${definition.key}`) || "").trim();
    const emphasis = String(formData.get(`emphasis_${definition.key}`) || "").trim();

    if (!value) failed(`Enter a value for ${definition.title}.`);
    if (value.length > MAX_LABEL_LENGTH || emphasis.length > MAX_LABEL_LENGTH) {
      failed(`Keep ${definition.title} under ${MAX_LABEL_LENGTH} characters.`);
    }

    return { key: definition.key, value, emphasis };
  });

  await writeLabels(db, actor.email, patch);
  await recordAudit(db, actor, "labels.updated", "labels", "site", { count: patch.length });
  invalidateTemplateCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();

  redirect(withFlashKey(`${LABELS_PATH}?saved=1`));
}
