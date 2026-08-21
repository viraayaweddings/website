"use server";

import { redirect } from "next/navigation";
import { LABEL_DEFINITIONS, writeLabels } from "@/worker/site/labels";
import { invalidateTemplateCache } from "@/worker/site/template";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const LABELS_PATH = "/admin/labels";

/** Wording is site-wide, so editing it is an admin-only action. */
export async function saveLabelsAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const patch = LABEL_DEFINITIONS.map((definition) => ({
    key: definition.key,
    value: String(formData.get(`value_${definition.key}`) || "").trim().slice(0, 200),
    emphasis: String(formData.get(`emphasis_${definition.key}`) || "").trim().slice(0, 200),
  })).filter((entry) => entry.value);

  if (!patch.length) redirect(`${LABELS_PATH}?error=${encodeURIComponent("Enter a value for at least one label.")}`);

  await writeLabels(db, actor.email, patch);
  await recordAudit(db, actor, "labels.updated", "labels", "site", { count: patch.length });
  invalidateTemplateCache();

  redirect(`${LABELS_PATH}?saved=1`);
}
