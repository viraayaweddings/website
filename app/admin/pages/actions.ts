"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { emptyEnv } from "@/worker/env";
import { uploadImage } from "@/worker/admin/media-store";
import { mediaPathFromKey } from "@/worker/admin/media-path";
import { staticPages } from "@/worker/db/schema";
import { invalidateStaticPageCache, normalizeStaticPath } from "@/worker/site/static-pages";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const LIST_PATH = "/admin/pages";
const BULK_LIMIT = 200;

/** The list view to return to, so filters and sort survive an action. */
function backTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith(LIST_PATH) && !raw.startsWith("//") ? raw : LIST_PATH;
}

/** Request paths only: one leading slash, no query, no traversal. */
function isRequestPath(value: string): boolean {
  return /^\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value) && !value.includes("//") && !value.includes("..");
}

function readIds(formData: FormData): string[] {
  return [
    ...new Set(
      formData
        .getAll("ids")
        .map((value) => normalizeStaticPath(String(value || "").trim()))
        .filter(isRequestPath),
    ),
  ];
}

/** The stored path doubles as the admin URL segment, so it travels encoded. */
function editorPath(path: string): string {
  return `${LIST_PATH}/${encodeURIComponent(path)}`;
}

function failed(target: string, message: string): never {
  redirect(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function done(target: string, message: string): never {
  redirect(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`);
}

function removed(target: string, message: string): never {
  redirect(`${target}${target.includes("?") ? "&" : "?"}deleted=${encodeURIComponent(message)}`);
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
    replacement = mediaPathFromKey(result.key);
  }

  if (!replacement) failed(editorPath(path), "Choose a picture from the library first.");
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
  const target = backTo(formData);

  const path = normalizeStaticPath(text(formData, "path", 200) || String(formData.get("id") || ""));
  const page = await loadPage(db, path);
  if (!page) failed(target, "That page is no longer stored.");

  await db.delete(staticPages).where(eq(staticPages.path, path));
  await recordAudit(db, actor, "page.reset", "static_page", path, {});
  invalidateStaticPageCache();
  removed(target, `${path} is back to its original markup. The next import will store it again.`);
}

/**
 * Adds a page at a new path by copying an existing one.
 *
 * There is no markup editor here on purpose -- several of these pages carry the
 * inline scripts the calculators need -- so a new page starts as a copy of one
 * that already works, and is then made its own by swapping its pictures and its
 * search listing. The path needs no build step: nothing is on disk at it, so
 * the request falls through to the handler, which serves the stored row.
 */
export async function createStaticPageAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const rawPath = text(formData, "path", 200);
  const path = normalizeStaticPath(rawPath.startsWith("/") ? rawPath : `/${rawPath}`);
  if (!isRequestPath(path)) {
    failed(target, "Use a path like /wedding-packages-2027 — letters, numbers, hyphens and slashes.");
  }

  const title = text(formData, "title", 300);
  if (!title) failed(target, "Enter the page title.");

  const source = normalizeStaticPath(text(formData, "source", 200));
  const template = await loadPage(db, source);
  if (!template) failed(target, "Choose an existing page to copy the layout from.");

  const clash = await loadPage(db, path);
  if (clash) failed(target, `${path} already has a stored page.`);

  await db.insert(staticPages).values({
    path,
    title,
    metaDescription: text(formData, "metaDescription", 400),
    html: template.html,
    // Hidden to begin with: the copy still carries the source page's wording,
    // and publishing that at a new URL would put a duplicate live.
    published: 0,
    updatedBy: actor.email,
  });

  await recordAudit(db, actor, "page.created", "static_page", path, { copiedFrom: source, title });
  invalidateStaticPageCache();
  done(editorPath(path), `${path} created from ${source}. It stays hidden until you show it.`);
}

/** Shows or hides the selected pages in one pass. */
export async function bulkPublishPagesAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const wanted = String(formData.get("published") || "");
  if (wanted !== "1" && wanted !== "0") failed(target, "Choose whether to show or hide the selected pages.");
  const published = wanted === "1" ? 1 : 0;

  const paths = readIds(formData);
  if (!paths.length) failed(target, "Select at least one page first.");
  if (paths.length > BULK_LIMIT) failed(target, `Update ${BULK_LIMIT} pages or fewer at a time.`);

  const updated = await db
    .update(staticPages)
    .set({ published, updatedAt: new Date(), updatedBy: actor.email })
    .where(inArray(staticPages.path, paths))
    .returning({ path: staticPages.path });

  if (!updated.length) failed(target, "Those pages are no longer stored. Refresh and try again.");

  await recordAudit(db, actor, "page.bulk_published", "static_page", paths.join(","), {
    published,
    count: updated.length,
  });
  invalidateStaticPageCache();
  done(target, `${updated.length} page${updated.length === 1 ? "" : "s"} ${published ? "shown" : "hidden"}.`);
}

/** Puts every selected page back to the markup it shipped with. */
export async function bulkResetPagesAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const paths = readIds(formData);
  if (!paths.length) failed(target, "Select at least one page first.");
  if (paths.length > BULK_LIMIT) failed(target, `Reset ${BULK_LIMIT} pages or fewer at a time.`);

  const removedRows = await db
    .delete(staticPages)
    .where(inArray(staticPages.path, paths))
    .returning({ path: staticPages.path });

  if (!removedRows.length) failed(target, "Those pages are no longer stored. Refresh and try again.");

  await recordAudit(db, actor, "page.bulk_reset", "static_page", paths.join(","), {
    count: removedRows.length,
  });
  invalidateStaticPageCache();
  removed(
    target,
    `${removedRows.length} page${removedRows.length === 1 ? "" : "s"} back to their original markup.`,
  );
}
