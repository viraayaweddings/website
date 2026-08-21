"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { asc, eq, sql } from "drizzle-orm";
import { releaseImage, uploadImage } from "@/worker/admin/media-store";
import { heroSlides } from "@/worker/db/schema";
import { invalidateHeroCache, safeHref } from "@/worker/site/hero";
import { invalidateTemplateCache } from "@/worker/site/template";
import { recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";

const HERO_PATH = "/admin/hero";

function failed(message: string): never {
  redirect(`${HERO_PATH}?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`${HERO_PATH}?saved=${encodeURIComponent(message)}`);
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

/** Returns the uploaded key, or "" when no file was chosen. */
async function readUpload(formData: FormData, uploadedBy: string): Promise<string> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return "";

  const result = await uploadImage(emptyEnv(), file, uploadedBy);
  if ("error" in result) failed(result.error);
  return result.key;
}

export async function createSlideAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const db = await requireDb();

  const fields = readSlideFields(formData);
  validate(fields);

  const imageKey = await readUpload(formData, actor.email);
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
  await recordAudit(db, actor, "hero.slide_created", "hero_slide", inserted[0]?.id ?? 0, {
    title: fields.title,
  });

  done("Slide added.");
}

export async function updateSlideAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(HERO_PATH);

  const existing = (await db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1))[0];
  if (!existing) failed("That slide no longer exists.");

  const fields = readSlideFields(formData);
  validate(fields);

  const uploadedKey = await readUpload(formData, actor.email);

  await db
    .update(heroSlides)
    .set({ ...fields, imageKey: uploadedKey || existing.imageKey, updatedAt: new Date() })
    .where(eq(heroSlides.id, id));

  // Release the previous image only after the replacement is safely stored.
  // releaseImage keeps it if anything else still points at it.
  if (uploadedKey && existing.imageKey !== uploadedKey) {
    await releaseImage(emptyEnv(), existing.imageKey);
  }

  invalidateHeroCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "hero.slide_updated", "hero_slide", id, { title: fields.title });

  done("Slide updated.");
}

/** Destructive, so admins only — consistent with every other delete. */
export async function deleteSlideAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(HERO_PATH);

  const existing = (await db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1))[0];
  if (!existing) redirect(HERO_PATH);

  await db.delete(heroSlides).where(eq(heroSlides.id, id));
  await releaseImage(emptyEnv(), existing.imageKey);

  invalidateHeroCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "hero.slide_deleted", "hero_slide", id, { title: existing.title });

  done("Slide deleted.");
}

/** Swaps a slide with its neighbour so the order can be nudged one step at a time. */
export async function moveSlideAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  const direction = String(formData.get("direction") || "");
  if (!Number.isInteger(id) || (direction !== "up" && direction !== "down")) redirect(HERO_PATH);

  const ordered = await db
    .select({ id: heroSlides.id })
    .from(heroSlides)
    .orderBy(asc(heroSlides.position), asc(heroSlides.id));

  const index = ordered.findIndex((slide) => slide.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) redirect(HERO_PATH);

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  // Rewrite the whole sequence so positions stay dense and unambiguous.
  for (const [position, slide] of ordered.entries()) {
    await db.update(heroSlides).set({ position }).where(eq(heroSlides.id, slide.id));
  }

  invalidateHeroCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "hero.reordered", "hero_slide", id, { direction });

  done("Order updated.");
}
