"use server";

import { redirect } from "next/navigation";

const MEDIA_PATH = "/admin/media";

async function serverDependencies() {
  const [{ emptyEnv }, { releaseImage, uploadImage }, { findImageReferences, replaceImageReferences }, { recordAudit, requireDb, requireRole }] =
    await Promise.all([
      import("@/worker/env"),
      import("@/worker/admin/media-store"),
      import("@/worker/admin/image-references"),
      import("../_lib/auth"),
    ]);

  return { emptyEnv, releaseImage, uploadImage, findImageReferences, replaceImageReferences, recordAudit, requireDb, requireRole };
}

/**
 * Removes an uploaded image. Refuses while anything still points at it, so a
 * picture shared by two venues cannot be pulled out from under one of them.
 */
export async function deleteMediaAction(formData: FormData): Promise<void> {
  const { emptyEnv, releaseImage, findImageReferences, recordAudit, requireDb, requireRole } =
    await serverDependencies();
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

/** Removes selected uploaded images, refusing the batch if any are still used. */
export async function bulkDeleteMediaAction(formData: FormData): Promise<void> {
  const { emptyEnv, releaseImage, findImageReferences, recordAudit, requireDb, requireRole } =
    await serverDependencies();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const keys = [...new Set(formData.getAll("ids").map((value) => String(value || "").trim()).filter(Boolean))]
    .slice(0, 200);
  if (!keys.length) redirect(`${MEDIA_PATH}?error=${encodeURIComponent("Select at least one image first.")}`);

  const blocked: string[] = [];
  for (const key of keys) {
    const references = await findImageReferences(db, key);
    if (references.length) blocked.push(key);
  }

  if (blocked.length) {
    redirect(
      `${MEDIA_PATH}?error=${encodeURIComponent(
        `${blocked.length} selected image${blocked.length === 1 ? " is" : "s are"} still used. Change those references first.`,
      )}`,
    );
  }

  const outcomes: Record<string, string> = {};
  for (const key of keys) {
    outcomes[key] = await releaseImage(emptyEnv(), key);
  }

  await recordAudit(db, actor, "media.bulk_deleted", "media", keys.join(","), {
    count: keys.length,
    outcomes,
  });

  redirect(`${MEDIA_PATH}?saved=${encodeURIComponent(`${keys.length} image${keys.length === 1 ? "" : "s"} deleted.`)}`);
}

/** Uploads a new image and repoints every database-managed reference to it. */
export async function replaceMediaAction(formData: FormData): Promise<void> {
  const { emptyEnv, uploadImage, releaseImage, replaceImageReferences, recordAudit, requireDb, requireRole } =
    await serverDependencies();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const oldKey = String(formData.get("key") || "").trim();
  const file = formData.get("file");
  if (!oldKey) redirect(MEDIA_PATH);
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${MEDIA_PATH}?error=${encodeURIComponent("Choose an image to replace it with.")}`);
  }

  const result = await uploadImage(emptyEnv(), file, actor.email);
  if ("error" in result) redirect(`${MEDIA_PATH}?error=${encodeURIComponent(result.error)}`);

  if (result.key === oldKey) {
    redirect(`${MEDIA_PATH}?saved=${encodeURIComponent("That image is already the same file.")}`);
  }

  const referencesChanged = await replaceImageReferences(db, oldKey, result.key);
  const oldOutcome = await releaseImage(emptyEnv(), oldKey);

  await recordAudit(db, actor, "media.replaced", "media", oldKey, {
    oldKey,
    newKey: result.key,
    referencesChanged,
    oldOutcome,
  });

  redirect(
    `${MEDIA_PATH}?saved=${encodeURIComponent(
      `Image replaced. ${referencesChanged} reference${referencesChanged === 1 ? "" : "s"} updated.`,
    )}`,
  );
}
