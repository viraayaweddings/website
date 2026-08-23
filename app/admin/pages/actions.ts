"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { emptyEnv } from "@/worker/env";
import { uploadImage } from "@/worker/admin/media-store";
import { mediaPathFromKey } from "@/worker/admin/media-path";
import { staticPages } from "@/worker/db/schema";
import { invalidateStaticPageCache, normalizeStaticPath } from "@/worker/site/static-pages";
import { STORED_PAGE_PATHS } from "@/worker/site/static-page-paths.generated";
import { assertSameOrigin, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { hasMoved, readExpectedVersion, STALE_MESSAGE } from "../_lib/concurrency";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

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
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`));
}

function done(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`));
}

function removed(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}deleted=${encodeURIComponent(message)}`));
}

function text(formData: FormData, name: string, max = 400): string {
  return String(formData.get(name) || "").trim().slice(0, max);
}

/** Only a key this site issued; never a URL pointing somewhere else. */
/**
 * Whether resetting this page would put back a file that exists.
 *
 * The `origin` column records how a row was created, but only for rows created
 * after it was added -- a page made in the panel before then still says
 * "import". The generated path list is the on-disk truth and covers both.
 */
const ON_DISK = new Set(STORED_PAGE_PATHS);

function hasOriginalMarkup(page: { path: string; origin: string }): boolean {
  return page.origin !== "panel" && ON_DISK.has(page.path);
}

function isMediaPath(value: string): boolean {
  return /^\/media\/[A-Za-z0-9/_.-]+$/.test(value) && !value.includes("..");
}

async function loadPage(db: Awaited<ReturnType<typeof requireDb>>, path: string) {
  const rows = await db.select().from(staticPages).where(eq(staticPages.path, path)).limit(1);
  return rows[0] ?? null;
}

export async function saveStaticPageAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const path = normalizeStaticPath(text(formData, "path", 200));
  const page = await loadPage(db, path);
  if (!page) failed(LIST_PATH, "That page is no longer stored.");
  if (hasMoved(readExpectedVersion(formData), page.updatedAt)) failed(editorPath(path), STALE_MESSAGE);

  const title = text(formData, "title", 300);
  const metaDescription = text(formData, "metaDescription", 400);
  const published = formData.get("published") === "on" ? 1 : 0;

  await db
    .update(staticPages)
    .set({ title, metaDescription, published, updatedAt: new Date(), updatedBy: actor.email })
    .where(eq(staticPages.path, path));

  await recordAudit(db, actor, "page.updated", "static_page", path, { title, published });
  invalidateStaticPageCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
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
  await assertSameOrigin();
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

  // Counted from the split, not inferred from a length delta. Media keys are
  // content hashes, so the old and new key are almost always the same length --
  // the delta was zero and the count always came out zero with it.
  const parts = page.html.split(current);
  const swapped = parts.length - 1;
  const html = parts.join(replacement);

  await db
    .update(staticPages)
    .set({ html, updatedAt: new Date(), updatedBy: actor.email })
    .where(eq(staticPages.path, path));

  await recordAudit(db, actor, "page.image_replaced", "static_page", path, {
    from: current,
    to: replacement,
  });
  invalidateStaticPageCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
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
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const path = normalizeStaticPath(text(formData, "path", 200) || String(formData.get("id") || ""));
  const page = await loadPage(db, path);
  if (!page) failed(target, "That page is no longer stored.");

  // Reset works by dropping the row, because the file the page was cloned from
  // is still on disk and is served whenever the stored copy is missing. A page
  // created here has no file behind it, so the same click would delete it
  // outright -- and the old wording promised the opposite.
  if (!hasOriginalMarkup(page)) {
    failed(
      target,
      `${path} has no original markup to go back to — it was created in the panel rather than cloned from a file. Hide it instead, or delete it deliberately.`,
    );
  }

  await db.delete(staticPages).where(eq(staticPages.path, path));
  await recordAudit(db, actor, "page.reset", "static_page", path, {});
  invalidateStaticPageCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
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
  await assertSameOrigin();
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
    // Nothing is on disk at this path, so "reset" cannot mean "serve the
    // original file" for this row. Recorded so the reset actions can refuse.
    origin: "panel",
    updatedBy: actor.email,
  });

  await recordAudit(db, actor, "page.created", "static_page", path, { copiedFrom: source, title });
  invalidateStaticPageCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(editorPath(path), `${path} created from ${source}. It stays hidden until you show it.`);
}

/** Shows or hides the selected pages in one pass. */
export async function bulkPublishPagesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
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
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(target, `${updated.length} page${updated.length === 1 ? "" : "s"} ${published ? "shown" : "hidden"}.`);
}

/** Puts every selected page back to the markup it shipped with. */
export async function bulkResetPagesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const paths = readIds(formData);
  if (!paths.length) failed(target, "Select at least one page first.");
  if (paths.length > BULK_LIMIT) failed(target, `Reset ${BULK_LIMIT} pages or fewer at a time.`);

  // Same rule as the single reset, checked before anything is removed: a batch
  // that quietly deleted the panel-created pages inside it would be the worst
  // version of this bug.
  const selected = await db
    .select({ path: staticPages.path, origin: staticPages.origin })
    .from(staticPages)
    .where(inArray(staticPages.path, paths));
  const created = selected.filter((page) => !hasOriginalMarkup(page));

  if (created.length) {
    failed(
      target,
      `${created.length} selected page${created.length === 1 ? " was" : "s were"} created in the panel and ` +
        `${created.length === 1 ? "has" : "have"} no original markup to go back to (${created[0].path}). Deselect ${created.length === 1 ? "it" : "them"} and try again.`,
    );
  }

  const removedRows = await db
    .delete(staticPages)
    .where(inArray(staticPages.path, paths))
    .returning({ path: staticPages.path });

  if (!removedRows.length) failed(target, "Those pages are no longer stored. Refresh and try again.");

  await recordAudit(db, actor, "page.bulk_reset", "static_page", paths.join(","), {
    count: removedRows.length,
  });
  invalidateStaticPageCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  removed(
    target,
    `${removedRows.length} page${removedRows.length === 1 ? "" : "s"} back to their original markup.`,
  );
}
