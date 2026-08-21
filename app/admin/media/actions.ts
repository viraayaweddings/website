"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { releaseImage } from "@/worker/admin/media-store";
import { findImageReferences } from "@/worker/admin/image-references";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const MEDIA_PATH = "/admin/media";

/**
 * Removes an uploaded image. Refuses while anything still points at it, so a
 * picture shared by two venues cannot be pulled out from under one of them.
 */
export async function deleteMediaAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const key = String(formData.get("key") || "");
  if (!key) redirect(MEDIA_PATH);

  const references = await findImageReferences(db, key);
  if (references.length) {
    redirect(
      `${MEDIA_PATH}?error=${encodeURIComponent(
        `Still used by ${references.length} item${references.length === 1 ? "" : "s"}. Change those first.`,
      )}`,
    );
  }

  const outcome = await releaseImage(emptyEnv(), key);
  await recordAudit(db, actor, "media.deleted", "media", key, { outcome });

  redirect(`${MEDIA_PATH}?saved=1`);
}
