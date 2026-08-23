import { eq } from "drizzle-orm";
import { isR2Configured, r2Delete, r2Head, r2Put } from "../storage/r2";
import { getDb, type DatabaseEnv } from "../db/client";
import { media } from "../db/schema";
import { ACCEPTED_IMAGE_TYPES, contentKey, imageDimensions, sniffImageType } from "./image-type";
import { isImageUnused } from "./image-references";
import { ACCEPTED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from "./media-config";

export const ACCEPTED_TYPES = ACCEPTED_IMAGE_TYPES.filter((type) =>
  ACCEPTED_UPLOAD_MIME_TYPES.includes(type),
);

export type UploadResult = { key: string } | { error: string };

export async function uploadImage(
  _env: DatabaseEnv,
  file: File,
  uploadedBy: string,
): Promise<UploadResult> {
  if (!isR2Configured()) return { error: "No media storage is configured for this site." };
  if (file.size === 0) return { error: "That file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `Images must be under ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImageType(bytes);
  if (!kind) return { error: "That file is not a JPEG, PNG, WebP or AVIF image." };
  const naturalSize = imageDimensions(bytes, kind.mime);

  const key = await contentKey(bytes, kind.extension);

  let uploadedNewObject = false;
  try {
    const existing = await r2Head(key);
    if (!existing) {
      const ok = await r2Put(key, bytes, kind.mime);
      if (!ok) return { error: "Could not store the image. Try again." };
      uploadedNewObject = true;
    }
  } catch (error) {
    console.error("[media] put failed", error instanceof Error ? error.message : error);
    return { error: "Could not store the image. Try again." };
  }

  try {
    const db = await getDb();
    if (!db) {
      if (uploadedNewObject) await r2Delete(key).catch(() => undefined);
      return { error: "Database unavailable. The image was not saved." };
    }

    await db
      .insert(media)
      .values({
        key,
        filename: file.name.slice(0, 200),
        contentType: kind.mime,
        size: file.size,
        width: naturalSize?.width ?? 0,
        height: naturalSize?.height ?? 0,
        uploadedBy,
      })
      .onConflictDoUpdate({
        target: media.key,
        set: {
          filename: file.name.slice(0, 200),
          contentType: kind.mime,
          size: file.size,
          width: naturalSize?.width ?? 0,
          height: naturalSize?.height ?? 0,
          uploadedBy,
        },
      });
  } catch (error) {
    console.error("[media] record failed", error instanceof Error ? error.message : error);
    if (uploadedNewObject) await r2Delete(key).catch(() => undefined);
    return { error: "Could not save the image record. Try again." };
  }

  return { key };
}

export async function releaseImage(_env: DatabaseEnv, key: string): Promise<"kept" | "deleted" | "skipped"> {
  if (!key || key.startsWith("/")) return "skipped";

  try {
    const db = await getDb();
    if (db && !(await isImageUnused(db, key))) return "kept";

    await r2Delete(key);
    if (db) await db.delete(media).where(eq(media.key, key));
    return "deleted";
  } catch (error) {
    console.error("[media] release failed", error instanceof Error ? error.message : error);
    return "kept";
  }
}
