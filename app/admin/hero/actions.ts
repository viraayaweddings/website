"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { releaseImage, uploadImage } from "@/worker/admin/media-store";
import { mediaKeyFrom, mediaPathFromKey, readMediaPathValue } from "@/worker/admin/media-path";
import { heroSlides } from "@/worker/db/schema";
import { invalidateHeroCache, safeHref } from "@/worker/site/hero";
import { invalidateTemplateCache } from "@/worker/site/template";
import { assertSameOrigin, recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

const HERO_PATH = "/admin/hero";

function failed(message: string): never {
  redirect(withFlashKey(`${HERO_PATH}?error=${encodeURIComponent(message)}`));
}

function done(message: string): never {
  redirect(withFlashKey(`${HERO_PATH}?saved=${encodeURIComponent(message)}`));
}

function readSlideFields(formData: FormData) {
  return {
    title: String(formData.get("title") || "").trim().slice(0, 200),
    description: String(formData.get("description") || "").trim().slice(0, 600),
    badgeTitle: String(formData.get("badgeTitle") || "").trim().slice(0, 120),
    badgeSubtitle: String(formData.get("badgeSubtitle") || "").trim().slice(0, 120),
    ctaLabel: String(formData.get("ctaLabel") || "").trim().slice(0, 60),
    ctaHref: String(formData.get("ctaHref") || "").trim().slice(0, 300),
    published: formData.get("published") === "on" ? 1 : 0,
  };
}

function validate(fields: ReturnType<typeof readSlideFields>) {
  if (!fields.title) failed("Give the slide a heading.");
  if (fields.ctaLabel && !fields.ctaHref) failed("The button needs a link.");
  if (fields.ctaHref && safeHref(fields.ctaHref) === "#") {
    failed("The button link must be a site path like /contact or a full https:// URL.");
  }
}

/**
 * The slide's background, as the stored `/media/<key>` path.
 *
 * The picker posts a path it already holds; a file input is still honoured so
 * the form keeps working without client-side JavaScript. Empty means the field
 * was cleared.
 */
async function readSlideImage(formData: FormData, uploadedBy: string): Promise<string> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, uploadedBy);
    if ("error" in result) failed(result.error);
    return mediaPathFromKey(result.key);
  }

  const chosen = readMediaPathValue(String(formData.get("imageKey") || ""));
  if ("error" in chosen) failed(chosen.error);
  return chosen.path;
}

/** Frees a stored image if nothing else points at it. Takes the stored path. */
async function releaseStoredImage(value: string): Promise<void> {
  const key = mediaKeyFrom(value);
  if (key) await releaseImage(emptyEnv(), key);
}

export async function createSlideAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();

  const fields = readSlideFields(formData);
  validate(fields);

  const imageKey = await readSlideImage(formData, actor.email);
  if (!imageKey) failed("Choose a background image for the slide.");

  const [{ nextPosition }] = await db
    .select({ nextPosition: sql<number>`coalesce(max(${heroSlides.position}), -1) + 1` })
    .from(heroSlides);

  const inserted = await db
    .insert(heroSlides)
    .values({ ...fields, imageKey, position: Number(nextPosition) })
    .returning({ id: heroSlides.id });

  invalidateHeroCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hero.slide_created", "hero_slide", inserted[0]?.id ?? 0, {
    title: fields.title,
  });

  done("Slide added.");
}

export async function updateSlideAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id) || id <= 0) failed("That slide could not be identified.");

  const existing = (await db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1))[0];
  if (!existing) failed("That slide no longer exists.");

  const fields = readSlideFields(formData);
  validate(fields);

  const imageKey = await readSlideImage(formData, actor.email);
  if (!imageKey) failed("A slide needs a background image; the carousel has nothing to show without one.");

  await db
    .update(heroSlides)
    .set({ ...fields, imageKey, updatedAt: new Date() })
    .where(eq(heroSlides.id, id));

  // Release the previous image only after the replacement is safely stored.
  // releaseImage keeps it if anything else still points at it.
  if (existing.imageKey !== imageKey) await releaseStoredImage(existing.imageKey);

  invalidateHeroCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hero.slide_updated", "hero_slide", id, { title: fields.title });

  done("Slide updated.");
}

/** Destructive, so admins only — consistent with every other delete. */
export async function deleteSlideAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id) || id <= 0) failed("That slide could not be identified.");

  const existing = (await db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1))[0];
  if (!existing) failed("That slide no longer exists.");

  await db.delete(heroSlides).where(eq(heroSlides.id, id));
  await releaseStoredImage(existing.imageKey);

  invalidateHeroCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hero.slide_deleted", "hero_slide", id, { title: existing.title });

  done("Slide deleted.");
}

/** Deletes every selected hero slide and releases their images if unused. */
export async function bulkDeleteSlidesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  const uniqueIds = [...new Set(ids)];

  if (!uniqueIds.length) failed("Select at least one slide first.");
  if (uniqueIds.length > 200) failed("Delete 200 slides or fewer at a time.");

  const existing = await db.select().from(heroSlides).where(inArray(heroSlides.id, uniqueIds));
  if (existing.length !== uniqueIds.length) failed("Some selected slides no longer exist. Refresh and try again.");

  await db.delete(heroSlides).where(inArray(heroSlides.id, uniqueIds));
  for (const slide of existing) {
    await releaseStoredImage(slide.imageKey);
  }

  invalidateHeroCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hero.bulk_deleted", "hero_slide", uniqueIds.join(","), {
    count: uniqueIds.length,
  });

  done(`${uniqueIds.length} slide${uniqueIds.length === 1 ? "" : "s"} deleted.`);
}

/** Swaps a slide with its neighbour so the order can be nudged one step at a time. */
export async function moveSlideAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  const direction = String(formData.get("direction") || "");
  if (!Number.isInteger(id) || id <= 0) failed("That slide could not be identified.");
  if (direction !== "up" && direction !== "down") failed("Use the up or down control to reorder a slide.");

  const ordered = await db
    .select({ id: heroSlides.id })
    .from(heroSlides)
    .orderBy(asc(heroSlides.position), asc(heroSlides.id));

  const index = ordered.findIndex((slide) => slide.id === id);
  if (index === -1) failed("That slide no longer exists.");
  const target = direction === "up" ? index - 1 : index + 1;
  // Already at the end it is being nudged towards; nothing to do, and saying so
  // beats a silent reload that looks like the button did nothing.
  if (target < 0 || target >= ordered.length) {
    done(`That slide is already ${direction === "up" ? "first" : "last"}.`);
  }

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  // Rewrite the whole sequence so positions stay dense and unambiguous. One
  // statement rather than one per row: a partial rewrite would leave the
  // carousel in an order nobody asked for.
  await db
    .update(heroSlides)
    .set({
      // Cast: the bound positions arrive untyped, so Postgres infers the whole
      // CASE as text and refuses to store it in an integer column.
      position: sql`(case ${heroSlides.id} ${sql.join(
        ordered.map((slide, position) => sql`when ${slide.id} then ${position}`),
        sql` `,
      )} end)::int`,
    })
    .where(inArray(heroSlides.id, ordered.map((slide) => slide.id)));

  invalidateHeroCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hero.reordered", "hero_slide", id, { direction });

  done("Order updated.");
}
