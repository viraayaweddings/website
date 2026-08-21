"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { and, eq } from "drizzle-orm";
import { releaseImage, uploadImage } from "@/worker/admin/media-store";
import { readRichText } from "@/worker/admin/rich-text";
import { cityListings, hotels, POST_STATUSES, type BlogFaq, type HotelHighlight, type PostStatus } from "@/worker/db/schema";
import { invalidateHotelCache } from "@/worker/site/hotel";
import { invalidateTemplateCache } from "@/worker/site/template";
import { invalidateCityListingCache } from "@/worker/site/venue-listing";
import { recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";

const HOTELS_PATH = "/admin/hotels";

function failed(target: string, message: string): never {
  redirect(`${target}?error=${encodeURIComponent(message)}`);
}

/**
 * FAQ and highlight rows arrive as parallel indexed inputs, which keeps the
 * form working without client-side JavaScript. Clearing the first field of a
 * row removes it.
 */
async function readFaqs(formData: FormData, target: string): Promise<BlogFaq[]> {
  const faqs: BlogFaq[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^faq_question_(\d+)$/.exec(key);
    if (!match) continue;

    const question = String(value).trim();
    if (!question) continue;

    // Answers are HTML written in the editor, so they are sanitised and
    // length-checked rather than cut to a byte count, which would split a tag.
    const answer = await readRichText(String(formData.get(`faq_answer_${match[1]}`) || ""), `The answer to "${question.slice(0, 40)}"`);
    if ("error" in answer) failed(target, answer.error);

    faqs.push({
      id: Number.parseInt(String(formData.get(`faq_id_${match[1]}`) || "0"), 10) || 0,
      question: question.slice(0, 400),
      answer: answer.html,
    });
  }

  // Anchors must stay unique; only genuinely new rows get a fresh id.
  let next = Math.max(0, ...faqs.map((faq) => faq.id)) + 1;
  for (const faq of faqs) {
    if (!faq.id) {
      faq.id = next;
      next += 1;
    }
  }

  return faqs;
}

function readHighlights(formData: FormData): HotelHighlight[] {
  const highlights: HotelHighlight[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^highlight_title_(\d+)$/.exec(key);
    if (!match) continue;

    const title = String(value).trim();
    const image = String(formData.get(`highlight_image_${match[1]}`) || "").trim();
    if (title && image) highlights.push({ title: title.slice(0, 300), image: image.slice(0, 400) });
  }

  return highlights;
}

/** URL-safe, lowercase, no leading or trailing hyphen. */
function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Creates a venue that has no page of its own in the site files. It is
 * rendered using the layout of an existing venue, the same way new blog posts
 * are handled.
 */
export async function createHotelAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const db = await requireDb();
  const target = "/admin/hotels/new";

  const city = normaliseSlug(String(formData.get("city") || ""));
  const slug = normaliseSlug(String(formData.get("slug") || ""));
  const name = String(formData.get("name") || "").trim().slice(0, 300);

  if (!city) failed(target, "Enter a city, using letters, numbers and hyphens.");
  if (!slug) failed(target, "Enter a URL slug, using letters, numbers and hyphens.");
  if (!name) failed(target, "Enter the venue name.");

  const clash = await db
    .select({ id: hotels.id })
    .from(hotels)
    .where(and(eq(hotels.city, city), eq(hotels.slug, slug)))
    .limit(1);
  if (clash.length) failed(target, `/destination-wedding/${city}/${slug} is already in use.`);

  const requestedStatus = String(formData.get("status") || "draft");
  const status: PostStatus = (POST_STATUSES as readonly string[]).includes(requestedStatus)
    ? (requestedStatus as PostStatus)
    : "draft";

  const text = (field: string, max: number) => String(formData.get(field) || "").trim().slice(0, max);

  // Everything that can be refused is read before anything is uploaded, so a
  // rejected save leaves no orphaned image behind in R2.
  const description = await readRichText(String(formData.get("description") || ""), "The venue description");
  if ("error" in description) failed(target, description.error);
  const faqs = await readFaqs(formData, target);

  let bannerImage = text("bannerImage", 400);
  const file = formData.get("bannerFile");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, actor.email);
    if ("error" in result) failed(target, result.error);
    bannerImage = result.key;
  }

  const inserted = await db
    .insert(hotels)
    .values({
      city,
      slug,
      status,
      name,
      seoTitle: text("seoTitle", 300) || name,
      metaDescription: text("metaDescription", 500),
      metaKeywords: text("metaKeywords", 500),
      ogImage: text("ogImage", 400) || bannerImage,
      bannerImage,
      address: text("address", 500),
      airportTime: text("airportTime", 60),
      stationTime: text("stationTime", 60),
      description: description.html,
      roomInventory: text("roomInventory", 200),
      indoorVenues: text("indoorVenues", 400),
      outdoorVenues: text("outdoorVenues", 400),
      guestCapacity: text("guestCapacity", 60),
      receptionCapacity: text("receptionCapacity", 60),
      highlights: JSON.stringify(readHighlights(formData)),
      faqs: JSON.stringify(faqs),
      nearbySlugs: JSON.stringify(readNearby(formData)),
      thumbnailImage: text("thumbnailImage", 400),
      cityLabel: text("cityLabel", 200),
      venueCategory: text("venueCategory", 120),
      cardPax: text("cardPax", 60),
      externalHotelId: text("externalHotelId", 20),
      totalRooms: text("totalRooms", 20),
    })
    .returning({ id: hotels.id });

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();
  await recordAudit(db, actor, "hotel.created", "hotel", inserted[0]?.id ?? 0, { venue: `${city}/${slug}` });

  redirect(`${HOTELS_PATH}?saved=1`);
}

/**
 * Removes the managed content for a venue. Venues that shipped with the site
 * keep their original page; only ones added here disappear entirely.
 */
export async function deleteHotelAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(HOTELS_PATH);

  const existing = (await db.select().from(hotels).where(eq(hotels.id, id)).limit(1))[0];
  if (!existing) redirect(HOTELS_PATH);

  await db.delete(hotels).where(eq(hotels.id, id));

  // Drop city-page entries that pointed at it, so no listing keeps a reference
  // to a venue that no longer exists.
  await db
    .delete(cityListings)
    .where(and(eq(cityListings.venueCity, existing.city), eq(cityListings.venueSlug, existing.slug)));

  for (const image of [existing.bannerImage, existing.thumbnailImage, existing.ogImage]) {
    await releaseImage(emptyEnv(), image);
  }

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();
  await recordAudit(db, actor, "hotel.deleted", "hotel", id, {
    venue: `${existing.city}/${existing.slug}`,
    name: existing.name,
  });

  redirect(`${HOTELS_PATH}?saved=1`);
}

/**
 * The nearby strip is a chosen list of venues, one "city/slug" per line. Order
 * is kept, blanks and duplicates are dropped.
 */
function readNearby(formData: FormData): string[] {
  const seen = new Set<string>();
  return String(formData.get("nearbySlugs") || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\/+|\/+$/g, ""))
    .filter((line) => {
      if (!/^[a-z0-9-]+\/[a-z0-9-]+$/i.test(line) || seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .slice(0, 12);
}

export async function updateHotelAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(HOTELS_PATH);
  const target = `${HOTELS_PATH}/${id}`;

  const existing = (await db.select().from(hotels).where(eq(hotels.id, id)).limit(1))[0];
  if (!existing) failed(HOTELS_PATH, "That venue no longer exists.");

  const text = (field: string, max: number) =>
    String(formData.get(field) || "").trim().slice(0, max);

  const name = text("name", 300);
  if (!name) failed(target, "Enter the venue name.");

  const requestedStatus = String(formData.get("status") || existing.status);
  const status: PostStatus = (POST_STATUSES as readonly string[]).includes(requestedStatus)
    ? (requestedStatus as PostStatus)
    : existing.status;

  // Read before uploading, so a rejected save leaves no orphaned image in R2.
  const description = await readRichText(String(formData.get("description") || ""), "The venue description");
  if ("error" in description) failed(target, description.error);
  const faqs = await readFaqs(formData, target);

  // A new upload replaces the stored path; otherwise the typed path wins.
  let bannerImage = text("bannerImage", 400) || existing.bannerImage;
  const file = formData.get("bannerFile");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, actor.email);
    if ("error" in result) failed(target, result.error);
    bannerImage = result.key;
  }

  const thumbnailImage = text("thumbnailImage", 400);
  const ogImage = text("ogImage", 400);

  await db
    .update(hotels)
    .set({
      status,
      name,
      seoTitle: text("seoTitle", 300),
      metaDescription: text("metaDescription", 500),
      metaKeywords: text("metaKeywords", 500),
      ogImage,
      bannerImage,
      address: text("address", 500),
      airportTime: text("airportTime", 60),
      stationTime: text("stationTime", 60),
      description: description.html,
      roomInventory: text("roomInventory", 200),
      indoorVenues: text("indoorVenues", 400),
      outdoorVenues: text("outdoorVenues", 400),
      guestCapacity: text("guestCapacity", 60),
      receptionCapacity: text("receptionCapacity", 60),
      highlights: JSON.stringify(readHighlights(formData)),
      faqs: JSON.stringify(faqs),
      // The edit form is the only place this list can be changed, so leaving it
      // out of the update made the "Browse Similar Hotels" strip uneditable.
      nearbySlugs: JSON.stringify(readNearby(formData)),
      thumbnailImage,
      cityLabel: text("cityLabel", 200),
      venueCategory: text("venueCategory", 120),
      cardPax: text("cardPax", 60),
      externalHotelId: text("externalHotelId", 20),
      totalRooms: text("totalRooms", 20),
      updatedAt: new Date(),
    })
    .where(eq(hotels.id, id));

  // Release every image this venue no longer uses, once the replacements are
  // saved; releaseImage keeps one if another venue, post or slide still points
  // at it.
  for (const [was, now] of [
    [existing.bannerImage, bannerImage],
    [existing.thumbnailImage, thumbnailImage],
    [existing.ogImage, ogImage],
  ]) {
    if (was && was !== now) await releaseImage(emptyEnv(), was);
  }

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();
  await recordAudit(db, actor, "hotel.updated", "hotel", id, {
    venue: `${existing.city}/${existing.slug}`,
    status: { from: existing.status, to: status },
  });

  redirect(`${target}?saved=1`);
}
