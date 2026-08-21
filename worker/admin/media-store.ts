import { eq } from "drizzle-orm";
import { isR2Configured, r2Delete, r2Head, r2Put } from "../storage/r2";
import { getDb, type DatabaseEnv } from "../db/client";
import { media } from "../db/schema";
import { ACCEPTED_IMAGE_TYPES, contentKey, sniffImageType } from "./image-type";
import { isImageUnused } from "./image-references";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ACCEPTED_IMAGE_TYPES;

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

  const key = await contentKey(bytes, kind.extension);

  try {
    const existing = await r2Head(key);
    if (!existing) {
      const ok = await r2Put(key, bytes, kind.mime);
      if (!ok) return { error: "Could not store the image. Try again." };
    }
  } catch (error) {
    console.error("[media] put failed", error instanceof Error ? error.message : error);
    return { error: "Could not store the image. Try again." };
  }

  try {
    const db = await getDb();
    if (db) {
      await db
        .insert(media)
        .values({
          key,
          filename: file.name.slice(0, 200),
          contentType: kind.mime,
          size: file.size,
          uploadedBy,
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("[media] record failed", error instanceof Error ? error.message : error);
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
