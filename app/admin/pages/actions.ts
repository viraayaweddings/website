"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { emptyEnv } from "@/worker/env";
import { uploadImage } from "@/worker/admin/media-store";
import { staticPages } from "@/worker/db/schema";
import { invalidateStaticPageCache, normalizeStaticPath } from "@/worker/site/static-pages";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const LIST_PATH = "/admin/pages";

/** The stored path doubles as the admin URL segment, so it travels encoded. */
function editorPath(path: string): string {
  return `${LIST_PATH}/${encodeURIComponent(path)}`;
}

function failed(target: string, message: string): never {
  redirect(`${target}?error=${encodeURIComponent(message)}`);
}

function done(target: string, message: string): never {
  redirect(`${target}?saved=${encodeURIComponent(message)}`);
}

function text(formData: FormData, name: string, max = 400): string {
  return String(formData.get(name) || "").trim().slice(0, max);
}

/** Only a key this site issued; never a URL pointing somewhere else. */
function isMediaPath(value: string): boolean {
  return /^\/media\/[A-Za-z0-9/_.-]+$/.test(value) && !value.includes("..");
}

async function loadPage(db: Awaited<ReturnType<typeof requireDb>>, path: string) {
  const rows = await db.select().from(staticPages).where(eq(staticPages.path, path)).limit(1);
  return rows[0] ?? null;
}

export async function saveStaticPageAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const path = normalizeStaticPath(text(formData, "path", 200));
  const page = await loadPage(db, path);
  if (!page) failed(LIST_PATH, "That page is no longer stored.");

  const title = text(formData, "title", 300);
  const metaDescription = text(formData, "metaDescription", 400);
  const published = formData.get("published") === "on" ? 1 : 0;

  await db
    .update(staticPages)
    .set({ title, metaDescription, published, updatedAt: new Date(), updatedBy: actor.email })
    .where(eq(staticPages.path, path));

  await recordAudit(db, actor, "page.updated", "static_page", path, { title, published });
  invalidateStaticPageCache();
  done(editorPath(path), "Page saved.");
}

/**
 * Swaps one picture for another everywhere it appears on the page.
 *
 * Replacing by path rather than by position is deliberate: the same image is
 * often used twice on a page, once full size and once as a thumbnail, and
 * changing only one of them looks like a bug.
 */
export async function replacePageImageAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const path = normalizeStaticPath(text(formData, "path", 200));
  const current = text(formData, "current", 300);
  const page = await loadPage(db, path);
  if (!page) failed(LIST_PATH, "That page is no longer stored.");
  if (!isMediaPath(current)) failed(editorPath(path), "That image is not one this site stores.");
  if (!page.html.includes(current)) failed(editorPath(path), "That image is no longer on this page.");

  let replacement = text(formData, "replacement", 300);

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, actor.email);
    if ("error" in result) failed(editorPath(path), result.error);
    replacement = `/media/${result.key}`;
  }

  if (!replacement) failed(editorPath(path), "Choose a file to upload, or paste a media path.");
  if (!isMediaPath(replacement)) failed(editorPath(path), "Use a /media/... path from the library.");
  if (replacement === current) failed(editorPath(path), "That is already the image on this page.");

  const html = page.html.split(current).join(replacement);
  const swapped = (page.html.length - html.length) / (current.length - replacement.length || 1);

  await db
    .update(staticPages)
    .set({ html, updatedAt: new Date(), updatedBy: actor.email })
    .where(eq(staticPages.path, path));

  await recordAudit(db, actor, "page.image_replaced", "static_page", path, {
    from: current,
    to: replacement,
  });
  invalidateStaticPageCache();
  done(
    editorPath(path),
    swapped > 1 ? `Image replaced in ${swapped} places.` : "Image replaced.",
  );
}

/**
 * Puts a page back to the markup it shipped with.
 *
 * The cloned file is still on disk and still served whenever the stored copy is
 * missing, so dropping the row is the whole of the undo.
 */
export async function resetStaticPageAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const path = normalizeStaticPath(text(formData, "path", 200));
  const page = await loadPage(db, path);
  if (!page) failed(LIST_PATH, "That page is no longer stored.");

  await db.delete(staticPages).where(eq(staticPages.path, path));
  await recordAudit(db, actor, "page.reset", "static_page", path, {});
  invalidateStaticPageCache();
  done(LIST_PATH, `${path} is back to its original markup. The next import will store it again.`);
}
