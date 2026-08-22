"use server";

import { redirect } from "next/navigation";
import { LABEL_DEFINITIONS, writeLabels } from "@/worker/site/labels";
import { invalidateTemplateCache } from "@/worker/site/template";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const LABELS_PATH = "/admin/labels";
const MAX_LABEL_LENGTH = 200;

function failed(message: string): never {
  redirect(`${LABELS_PATH}?error=${encodeURIComponent(message)}`);
}

/** Wording is site-wide, so editing it is an admin-only action. */
export async function saveLabelsAction(formData: FormData): Promise<void> {
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

  redirect(`${LABELS_PATH}?saved=1`);
}
