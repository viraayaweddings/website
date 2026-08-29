"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { and, eq, inArray, like, ne } from "drizzle-orm";
import { releaseImage, uploadImage } from "@/worker/admin/media-store";
import { readGalleryRows } from "@/worker/admin/hotel-gallery-form";
import { mediaKeyFrom, mediaPathFromKey, readMediaPathValue } from "@/worker/admin/media-path";
import { readRichText } from "@/worker/admin/rich-text";
import { highestId, readRowIndices, TooManyRowsError } from "@/worker/admin/form-rows";
import { cityListings, hotels, venueTypes, POST_STATUSES, type BlogFaq, type HotelGalleryImage, type HotelHighlight, type PostStatus } from "@/worker/db/schema";
import { invalidateHotelCache } from "@/worker/site/hotel";
import { loadCalculatorConfig } from "@/worker/site/calculator-store";
import { invalidateVenueTypeCache, loadAllVenueTypes } from "@/worker/site/venue-types";
import { invalidateTemplateCache } from "@/worker/site/template";
import { invalidateCityListingCache } from "@/worker/site/venue-listing";
import { assertSameOrigin, recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";
import { hasMoved, readExpectedVersion, STALE_MESSAGE } from "../_lib/concurrency";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

const HOTELS_PATH = "/admin/hotels";

function failed(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`));
}

function done(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`));
}

/**
 * Checks the venue's calculator link before it is stored.
 *
 * `external_hotel_id` is what joins a venue page to its rates and its room cap.
 * Left blank or pointing at nothing, the page still renders a working-looking
 * calculator that quotes the wedding at zero: the price lookup misses, every
 * rate reads as 0, and the "Price on request" guard does not fire because it
 * has no hotel id to check. Refusing the save is the only point at which that
 * is visible to anyone.
 *
 * Blank is still allowed -- a venue can legitimately be published before it is
 * priced -- but a value that names no calculator hotel is not.
 */
async function readCalculatorHotelId(value: string, target: string): Promise<string> {
  const id = value.trim();
  if (!id) return "";

  const { roomsByHotel } = await loadCalculatorConfig();
  if (!Object.prototype.hasOwnProperty.call(roomsByHotel, id)) {
    failed(
      target,
      `Hotel ID ${id} is not in the cost calculator. Add it under Cost calculator → Hotels first, or leave the field blank.`,
    );
  }
  return id;
}

/**
 * The wedding-type tags, checked against the vocabulary before they are stored.
 *
 * A slug that names no `venue_types` row would tag the venue for a filter that
 * does not exist -- invisible on the venue page, and quietly missing from the
 * listing. Storing a sorted array keeps the column stable across saves.
 */
async function readWeddingTypes(formData: FormData): Promise<string> {
  const known = new Set((await loadAllVenueTypes()).map((type) => type.slug));
  const chosen = [
    ...new Set(
      formData
        .getAll("weddingTypes")
        .map((value) => String(value || "").trim())
        .filter((slug) => known.has(slug)),
    ),
  ].sort();
  return JSON.stringify(chosen);
}

/** Lower sorts first on /hotel-listing; anything unreadable goes to the end. */
function readListingPosition(formData: FormData): number {
  const raw = String(formData.get("listingPosition") || "").trim();
  if (!raw) return 9999;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) return 9999;
  return Math.min(value, 999_999);
}

/** The list view to return to, so filters, sort and page survive an action. */
function backTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith(HOTELS_PATH) && !raw.startsWith("//") ? raw : HOTELS_PATH;
}

/**
 * Image fields are stored as `/media/<key>` and rendered verbatim into `src`
 * attributes and `url()` values, so a bare key here would resolve relative to
 * the venue page and the picture would vanish.
 */
function readMediaPath(value: string, target: string): string {
  const result = readMediaPathValue(value);
  if ("error" in result) failed(target, result.error);
  return result.path;
}

/** Frees a stored image if nothing else points at it. Takes the stored path. */
async function releaseStoredImage(value: string): Promise<void> {
  const key = mediaKeyFrom(value);
  if (key) await releaseImage(emptyEnv(), key);
}

/**
 * FAQ and highlight rows arrive as parallel indexed inputs, which keeps the
 * form working without client-side JavaScript. Clearing the first field of a
 * row removes it.
 */
async function readFaqs(formData: FormData, target: string): Promise<BlogFaq[]> {
  const faqs: BlogFaq[] = [];

  // Capped before any answer is sanitised; see worker/admin/form-rows.ts.
  let indices: string[];
  try {
    indices = readRowIndices(formData, "faq_question_", "FAQ entries");
  } catch (error) {
    failed(target, error instanceof TooManyRowsError ? error.message : "Too many FAQ entries.");
  }

  for (const index of indices) {
    const question = String(formData.get(`faq_question_${index}`) || "").trim();
    if (!question) continue;

    // Answers are HTML written in the editor, so they are sanitised and
    // length-checked rather than cut to a byte count, which would split a tag.
    const answer = await readRichText(String(formData.get(`faq_answer_${index}`) || ""), `The answer to "${question.slice(0, 40)}"`);
    if ("error" in answer) failed(target, answer.error);

    faqs.push({
      id: Number.parseInt(String(formData.get(`faq_id_${index}`) || "0"), 10) || 0,
      question: question.slice(0, 400),
      answer: answer.html,
    });
  }

  // Anchors must stay unique; only genuinely new rows get a fresh id.
  let next = highestId(faqs.map((faq) => faq.id)) + 1;
  for (const faq of faqs) {
    if (!faq.id) {
      faq.id = next;
      next += 1;
    }
  }

  return faqs;
}

function readHighlights(formData: FormData, target: string): HotelHighlight[] {
  const highlights: HotelHighlight[] = [];

  let indices: string[];
  try {
    indices = readRowIndices(formData, "highlight_title_", "highlights");
  } catch (error) {
    failed(target, error instanceof TooManyRowsError ? error.message : "Too many highlights.");
  }

  for (const index of indices) {
    const title = String(formData.get(`highlight_title_${index}`) || "").trim();
    const image = readMediaPath(String(formData.get(`highlight_image_${index}`) || ""), target);
    if (title && image) highlights.push({ title: title.slice(0, 300), image: image.slice(0, 400) });
  }

  return highlights;
}

/** The gallery rows, failing the save the way the other readers do. */
function readGallery(formData: FormData, target: string): HotelGalleryImage[] {
  const result = readGalleryRows(formData);
  if ("error" in result) failed(target, result.error);
  return result.images;
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
  await assertSameOrigin();
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

  let bannerImage = readMediaPath(text("bannerImage", 400), target);
  const file = formData.get("bannerFile");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, actor.email);
    if ("error" in result) failed(target, result.error);
    bannerImage = mediaPathFromKey(result.key);
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
      ogImage: readMediaPath(text("ogImage", 400), target) || bannerImage,
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
      highlights: JSON.stringify(readHighlights(formData, target)),
      gallery: JSON.stringify(readGallery(formData, target)),
      faqs: JSON.stringify(faqs),
      nearbySlugs: JSON.stringify(readNearby(formData)),
      thumbnailImage: readMediaPath(text("thumbnailImage", 400), target),
      cityLabel: text("cityLabel", 200),
      venueCategory: text("venueCategory", 120),
      cardPax: text("cardPax", 60),
      externalHotelId: await readCalculatorHotelId(text("externalHotelId", 20), target),
      weddingTypes: await readWeddingTypes(formData),
      listingPosition: readListingPosition(formData),
    })
    .returning({ id: hotels.id });

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hotel.created", "hotel", inserted[0]?.id ?? 0, { venue: `${city}/${slug}` });

  redirect(withFlashKey(`${HOTELS_PATH}?saved=1`));
}

/**
 * Removes the managed content for a venue. Venues that shipped with the site
 * keep their original page; only ones added here disappear entirely.
 */
export async function deleteHotelAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id) || id <= 0) failed(target, "That venue could not be identified.");

  const existing = (await db.select().from(hotels).where(eq(hotels.id, id)).limit(1))[0];
  if (!existing) failed(target, "That venue no longer exists.");

  await db.delete(hotels).where(eq(hotels.id, id));

  // Drop city-page entries that pointed at it, so no listing keeps a reference
  // to a venue that no longer exists.
  await db
    .delete(cityListings)
    .where(and(eq(cityListings.venueCity, existing.city), eq(cityListings.venueSlug, existing.slug)));

  for (const image of [existing.bannerImage, existing.thumbnailImage, existing.ogImage]) {
    await releaseStoredImage(image);
  }

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hotel.deleted", "hotel", id, {
    venue: `${existing.city}/${existing.slug}`,
    name: existing.name,
  });

  done(target, `${existing.name || existing.slug} deleted.`);
}

/** Deletes every selected venue and removes listing rows that pointed at them. */
export async function bulkDeleteHotelsAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  const uniqueIds = [...new Set(ids)];

  if (!uniqueIds.length) failed(target, "Select at least one venue first.");
  if (uniqueIds.length > 200) failed(target, "Delete 200 venues or fewer at a time.");

  const existing = await db.select().from(hotels).where(inArray(hotels.id, uniqueIds));
  if (existing.length !== uniqueIds.length) failed(target, "Some selected venues no longer exist. Refresh and try again.");

  await db.delete(hotels).where(inArray(hotels.id, uniqueIds));

  for (const venue of existing) {
    await db
      .delete(cityListings)
      .where(and(eq(cityListings.venueCity, venue.city), eq(cityListings.venueSlug, venue.slug)));
    for (const image of [venue.bannerImage, venue.thumbnailImage, venue.ogImage]) {
      await releaseStoredImage(image);
    }
  }

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hotel.bulk_deleted", "hotel", uniqueIds.join(","), {
    count: uniqueIds.length,
  });

  done(target, `${uniqueIds.length} venue${uniqueIds.length === 1 ? "" : "s"} deleted.`);
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
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(HOTELS_PATH);
  const target = `${HOTELS_PATH}/${id}`;

  const existing = (await db.select().from(hotels).where(eq(hotels.id, id)).limit(1))[0];
  if (!existing) failed(HOTELS_PATH, "That venue no longer exists.");

  // Refused before anything is uploaded, so a losing save leaves nothing behind.
  const expectedVersion = readExpectedVersion(formData);
  if (hasMoved(expectedVersion, existing.updatedAt)) failed(target, STALE_MESSAGE);

  const text = (field: string, max: number) =>
    String(formData.get(field) || "").trim().slice(0, max);

  const name = text("name", 300);
  if (!name) failed(target, "Enter the venue name.");

  // The URL is editable, so it has to be validated the same way a new venue's
  // is: a clash would make one of the two pages unreachable.
  const city = normaliseSlug(String(formData.get("city") || existing.city)) || existing.city;
  const slug = normaliseSlug(String(formData.get("slug") || existing.slug)) || existing.slug;
  const moved = city !== existing.city || slug !== existing.slug;
  if (moved) {
    const clash = await db
      .select({ id: hotels.id })
      .from(hotels)
      .where(and(eq(hotels.city, city), eq(hotels.slug, slug), ne(hotels.id, id)))
      .limit(1);
    if (clash.length) failed(target, `/destination-wedding/${city}/${slug} is already used by another venue.`);
  }

  const requestedStatus = String(formData.get("status") || existing.status);
  const status: PostStatus = (POST_STATUSES as readonly string[]).includes(requestedStatus)
    ? (requestedStatus as PostStatus)
    : existing.status;

  // Read before uploading, so a rejected save leaves no orphaned image in R2.
  const description = await readRichText(String(formData.get("description") || ""), "The venue description");
  if ("error" in description) failed(target, description.error);
  const faqs = await readFaqs(formData, target);

  // The picker always posts the field, so an empty value is a deliberate clear
  // rather than a field the form left out.
  let bannerImage = readMediaPath(text("bannerImage", 400), target);
  const file = formData.get("bannerFile");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, actor.email);
    if ("error" in result) failed(target, result.error);
    bannerImage = mediaPathFromKey(result.key);
  }

  const thumbnailImage = readMediaPath(text("thumbnailImage", 400), target);
  const ogImage = readMediaPath(text("ogImage", 400), target);

  // One transaction: a venue that moved has to be repointed everywhere it is
  // referenced, and a failure between the two writes would drop it from every
  // city page and nearby strip while leaving the venue itself at its new URL.
  const saved = await db.transaction(async (tx) => {
    const rows = await tx
    .update(hotels)
    .set({
      city,
      slug,
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
      highlights: JSON.stringify(readHighlights(formData, target)),
      gallery: JSON.stringify(readGallery(formData, target)),
      faqs: JSON.stringify(faqs),
      // The edit form is the only place this list can be changed, so leaving it
      // out of the update made the "Browse Similar Hotels" strip uneditable.
      nearbySlugs: JSON.stringify(readNearby(formData)),
      thumbnailImage,
      cityLabel: text("cityLabel", 200),
      venueCategory: text("venueCategory", 120),
      cardPax: text("cardPax", 60),
      externalHotelId: await readCalculatorHotelId(text("externalHotelId", 20), target),
      weddingTypes: await readWeddingTypes(formData),
      listingPosition: readListingPosition(formData),
      updatedAt: new Date(),
    })
      .where(eq(hotels.id, id))
      .returning({ id: hotels.id });

    if (!rows.length) return false;

    // A venue that moved is still referenced by city pages and by other venues'
    // nearby strips, and those references are stored as "city/slug" text. Left
    // alone they would silently drop the venue from every list it appears in.
    if (moved) await repointVenueReferences(tx, existing.city, existing.slug, city, slug);

    return true;
  });

  if (!saved) failed(HOTELS_PATH, "That venue no longer exists.");

  // Release every image this venue no longer uses, once the replacements are
  // saved; releaseImage keeps one if another venue, post or slide still points
  // at it.
  for (const [was, now] of [
    [existing.bannerImage, bannerImage],
    [existing.thumbnailImage, thumbnailImage],
    [existing.ogImage, ogImage],
  ]) {
    if (was && was !== now) await releaseStoredImage(was);
  }

  invalidateHotelCache();
  invalidateTemplateCache();
  invalidateCityListingCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "hotel.updated", "hotel", id, {
    venue: `${city}/${slug}`,
    status: { from: existing.status, to: status },
  });
  if (moved) {
    await recordAudit(db, actor, "hotel.moved", "hotel", id, {
      url: { from: `${existing.city}/${existing.slug}`, to: `${city}/${slug}` },
    });
  }

  redirect(withFlashKey(`${target}?saved=1`));
}

/**
 * Rewrites the stored "city/slug" references to a venue that changed URL.
 *
 * City listings hold one row per reference; a venue's nearby strip holds a JSON
 * array, so those are rewritten in memory and written back. The caller supplies
 * the transaction, so this and the rename itself commit together -- a
 * half-applied move would leave listings pointing at a page that no longer
 * exists.
 */
type Transaction = Parameters<Parameters<Awaited<ReturnType<typeof requireDb>>["transaction"]>[0]>[0];

async function repointVenueReferences(
  tx: Transaction,
  fromCity: string,
  fromSlug: string,
  toCity: string,
  toSlug: string,
): Promise<void> {
  const was = `${fromCity}/${fromSlug}`;
  const now = `${toCity}/${toSlug}`;

  await tx
    .update(cityListings)
    .set({ venueCity: toCity, venueSlug: toSlug })
    .where(and(eq(cityListings.venueCity, fromCity), eq(cityListings.venueSlug, fromSlug)));

  const referrers = await tx
    .select({ id: hotels.id, nearbySlugs: hotels.nearbySlugs })
    .from(hotels)
    .where(like(hotels.nearbySlugs, `%${was}%`));

  for (const referrer of referrers) {
    const refs = readNearbyList(referrer.nearbySlugs);
    if (!refs.includes(was)) continue;
    const updated = [...new Set(refs.map((ref) => (ref === was ? now : ref)))];
    await tx
      .update(hotels)
      .set({ nearbySlugs: JSON.stringify(updated) })
      .where(eq(hotels.id, referrer.id));
  }
}

function readNearbyList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------- wedding types --- */

/**
 * Save (or add) one wedding type.
 *
 * The same rows render the filter checkboxes on /hotel-listing and the 53 city
 * index pages, the tag checkboxes on the venue form, and the `types` array in
 * the listing dataset. Before this they were three separate copies of the same
 * six values, and nothing kept them in step.
 */
export async function saveVenueTypeAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const label = String(formData.get("label") || "").trim().slice(0, 60);
  if (!slug) failed(HOTELS_PATH, "Give the wedding type a short slug, e.g. palace.");
  if (!label) failed(HOTELS_PATH, "Enter the label shown beside the checkbox, e.g. Palace Wedding.");

  const rawId = String(formData.get("typeId") || "").trim();
  const rawPosition = String(formData.get("position") || "").trim();
  const position = rawPosition ? Number.parseInt(rawPosition, 10) || 0 : 0;
  const published = formData.get("published") === "on" ? 1 : 0;

  const existing = await db.select().from(venueTypes);

  let id: number;
  if (rawId) {
    id = Number.parseInt(rawId, 10);
    if (!Number.isFinite(id)) failed(HOTELS_PATH, "That wedding type no longer exists.");
  } else {
    // The id is the `wedding_types[]=N` value. Continuing the sequence keeps
    // every existing listing link pointing at the type it always did.
    id = existing.reduce((highest, row) => Math.max(highest, row.id), 0) + 1;
  }

  const clash = existing.find((row) => row.slug === slug && row.id !== id);
  if (clash) failed(HOTELS_PATH, `The slug "${slug}" is already used by ${clash.label}.`);

  await db
    .insert(venueTypes)
    .values({ id, slug, label, published, position })
    .onConflictDoUpdate({
      target: venueTypes.id,
      set: { slug, label, published, position, updatedAt: new Date() },
    });

  await recordAudit(db, actor, "venue_type.saved", "venue_type", id, { slug, label });
  invalidateVenueTypeCache();
  // Tells the other instances their caches are stale; the local call above
  // only reaches this one.
  await publishContentChange();
  done(HOTELS_PATH, `${label} saved.`);
}

/**
 * Remove a wedding type.
 *
 * Refused while a venue still carries the tag: deleting it would leave that
 * venue tagged for a filter nobody can select, and no page would say so.
 * Unpublishing is the way to take a filter down without untagging anything.
 */
export async function deleteVenueTypeAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("typeId") || "").trim(), 10);
  if (!Number.isFinite(id)) failed(HOTELS_PATH, "That wedding type no longer exists.");

  const row = (await db.select().from(venueTypes).where(eq(venueTypes.id, id)).limit(1))[0];
  if (!row) failed(HOTELS_PATH, "That wedding type no longer exists.");

  const tagged = await db
    .select({ id: hotels.id })
    .from(hotels)
    .where(like(hotels.weddingTypes, `%"${row.slug}"%`));
  if (tagged.length) {
    failed(
      HOTELS_PATH,
      `${tagged.length} venue(s) are still tagged "${row.label}". Untag them first, or hide the type instead.`,
    );
  }

  await db.delete(venueTypes).where(eq(venueTypes.id, id));
  await recordAudit(db, actor, "venue_type.deleted", "venue_type", id, { slug: row.slug });
  invalidateVenueTypeCache();
  await publishContentChange();
  done(HOTELS_PATH, `${row.label} removed.`);
}
