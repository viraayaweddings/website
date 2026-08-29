"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cityListings, cityPages, hotels } from "@/worker/db/schema";
import { invalidateCityListingCache } from "@/worker/site/venue-listing";
import { invalidateTemplateCache } from "@/worker/site/template";
import { assertAdminRequest, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { hasMoved, readExpectedVersion, STALE_MESSAGE } from "../_lib/concurrency";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

const CITIES_PATH = "/admin/cities";
const BULK_LIMIT = 200;

/** URL segments only; the value becomes part of a public path. */
const CITY_SLUG = /^[a-z0-9-]+$/;

function failed(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`));
}

function done(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`));
}

function removed(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}deleted=${encodeURIComponent(message)}`));
}

/** The list view to return to, so filters and sort survive an action. */
function backTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith(CITIES_PATH) && !raw.startsWith("//") ? raw : CITIES_PATH;
}

/** URL-safe, lowercase, no leading or trailing hyphen. */
function normaliseCity(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * The venue list for a city page, one slug per line and in display order.
 * Entries may name another city as "city/slug"; a bare slug means this city.
 */
function readVenues(formData: FormData, city: string): { venueCity: string; venueSlug: string }[] {
  const seen = new Set<string>();

  return String(formData.get("venues") || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("/");
      return parts.length === 2
        ? { venueCity: parts[0], venueSlug: parts[1] }
        : { venueCity: city, venueSlug: parts[0] };
    })
    .filter((entry) => {
      const key = `${entry.venueCity}/${entry.venueSlug}`;
      const valid = CITY_SLUG.test(entry.venueCity.toLowerCase()) && CITY_SLUG.test(entry.venueSlug.toLowerCase());
      if (!valid || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** City pages are site-wide structure, so editing them is admin-only. */
export async function saveCityAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();

  const city = String(formData.get("city") || "").toLowerCase();
  if (!CITY_SLUG.test(city)) failed(CITIES_PATH, "That city page could not be identified.");
  const target = `${CITIES_PATH}/${city}`;

  const existing = (await db.select().from(cityPages).where(eq(cityPages.city, city)).limit(1))[0];
  if (!existing) failed(CITIES_PATH, "That city page no longer exists.");

  const seoTitle = String(formData.get("seoTitle") || "").trim().slice(0, 300);
  if (!seoTitle) failed(target, "Enter the page title.");

  const cityId = String(formData.get("cityId") || "").trim().slice(0, 20);
  if (cityId && !/^\d+$/.test(cityId)) failed(target, "The city ID is a number, as used by the venue filter.");

  const rawTotal = String(formData.get("totalVenues") || "").trim();
  const total = Number.parseInt(rawTotal || "0", 10);
  if (rawTotal && (!Number.isFinite(total) || total < 0 || total > 100_000)) {
    failed(target, "Total venues must be a whole number of zero or more.");
  }

  const venues = readVenues(formData, city);

  // Refused before any write: the page and its venue list are saved together,
  // and a second editor's list would otherwise replace the first's wholesale.
  if (hasMoved(readExpectedVersion(formData), existing.updatedAt)) failed(target, STALE_MESSAGE);

  // One transaction for the page and its listing. The list is replaced
  // wholesale because order matters and is easiest to express as the order the
  // lines were typed in; splitting that from the page update meant a failure
  // between them could leave a city with new copy and no venues.
  await db.transaction(async (tx) => {
    await tx
      .update(cityPages)
      .set({
        seoTitle,
        metaDescription: String(formData.get("metaDescription") || "").trim().slice(0, 500),
        cityId,
        heading: String(formData.get("heading") || "").trim().slice(0, 160),
        headingEmphasis: String(formData.get("headingEmphasis") || "").trim().slice(0, 160),
        published: formData.get("published") === "on" ? 1 : 0,
        // Drives the "Showing 1 - 12 of N" line and the pager.
        totalVenues: Number.isFinite(total) && total >= 0 ? total : venues.length,
        updatedAt: new Date(),
      })
      .where(eq(cityPages.city, city));

    await tx.delete(cityListings).where(eq(cityListings.city, city));

    if (venues.length > 0) {
      await tx.insert(cityListings).values(
        venues.map((venue, position) => ({ city, ...venue, position })),
      );
    }
  });

  invalidateCityListingCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "city.updated", "city_page", city, { venues: venues.length });

  done(target, "City page saved.");
}

/**
 * Adds a city index page.
 *
 * The shell is shared by every city, so a new one is immediately renderable:
 * it needs a slug, a title and the numeric id the venue filter posts back.
 */
export async function createCityAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const city = normaliseCity(String(formData.get("city") || ""));
  if (!city) failed(target, "Enter a city slug, using letters, numbers and hyphens.");

  const seoTitle = String(formData.get("seoTitle") || "").trim().slice(0, 300);
  if (!seoTitle) failed(target, "Enter the page title.");

  const cityId = String(formData.get("cityId") || "").trim().slice(0, 20);
  if (cityId && !/^\d+$/.test(cityId)) failed(target, "The city ID is a number, as used by the venue filter.");

  const clash = await db.select({ city: cityPages.city }).from(cityPages).where(eq(cityPages.city, city)).limit(1);
  if (clash.length) failed(target, `/destination-wedding/${city}/ already has a page.`);

  // The venues already recorded for this city are the obvious starting list,
  // rather than an index page that lists nothing.
  const venues = await db
    .select({ slug: hotels.slug })
    .from(hotels)
    .where(and(eq(hotels.city, city), eq(hotels.status, "published")))
    .orderBy(hotels.name);

  await db.transaction(async (tx) => {
    await tx.insert(cityPages).values({
      city,
      seoTitle,
      metaDescription: String(formData.get("metaDescription") || "").trim().slice(0, 500),
      cityId,
      totalVenues: venues.length,
      published: 1,
    });

    if (venues.length > 0) {
      await tx.insert(cityListings).values(
        venues.map((venue, position) => ({ city, venueCity: city, venueSlug: venue.slug, position })),
      );
    }
  });

  invalidateCityListingCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "city.created", "city_page", city, { venues: venues.length });

  done(`${CITIES_PATH}/${city}`, `${city} added with ${venues.length} venue${venues.length === 1 ? "" : "s"}.`);
}

/**
 * Removes a city index page and the venue list that belongs to it.
 *
 * The venues themselves are untouched: they have pages of their own and may be
 * listed by other cities.
 */
export async function deleteCityAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const city = String(formData.get("id") || formData.get("city") || "").toLowerCase();
  if (!CITY_SLUG.test(city)) failed(target, "That city page could not be identified.");

  const existing = (await db.select().from(cityPages).where(eq(cityPages.city, city)).limit(1))[0];
  if (!existing) failed(target, "That city page no longer exists.");

  await db.transaction(async (tx) => {
    await tx.delete(cityListings).where(eq(cityListings.city, city));
    await tx.delete(cityPages).where(eq(cityPages.city, city));
  });

  invalidateCityListingCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "city.deleted", "city_page", city, { seoTitle: existing.seoTitle });

  removed(target, `${city} deleted. Its venues keep their own pages.`);
}

export async function bulkDeleteCitiesAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const cities = [
    ...new Set(
      formData
        .getAll("ids")
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => CITY_SLUG.test(value)),
    ),
  ];

  if (!cities.length) failed(target, "Select at least one city page first.");
  if (cities.length > BULK_LIMIT) failed(target, `Delete ${BULK_LIMIT} city pages or fewer at a time.`);

  const existing = await db.select({ city: cityPages.city }).from(cityPages).where(inArray(cityPages.city, cities));
  if (existing.length !== cities.length) {
    failed(target, "Some selected city pages no longer exist. Refresh and try again.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(cityListings).where(inArray(cityListings.city, cities));
    await tx.delete(cityPages).where(inArray(cityPages.city, cities));
  });

  invalidateCityListingCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "city.bulk_deleted", "city_page", cities.join(","), { count: cities.length });

  removed(target, `${cities.length} city page${cities.length === 1 ? "" : "s"} deleted.`);
}

/** Shows or hides the selected city pages in one pass. */
export async function bulkPublishCitiesAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const wanted = String(formData.get("published") || "");
  if (wanted !== "1" && wanted !== "0") failed(target, "Choose whether to show or hide the selected pages.");
  const published = wanted === "1" ? 1 : 0;

  const cities = [
    ...new Set(
      formData
        .getAll("ids")
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => CITY_SLUG.test(value)),
    ),
  ];

  if (!cities.length) failed(target, "Select at least one city page first.");
  if (cities.length > BULK_LIMIT) failed(target, `Update ${BULK_LIMIT} city pages or fewer at a time.`);

  const updated = await db
    .update(cityPages)
    .set({ published })
    .where(inArray(cityPages.city, cities))
    .returning({ city: cityPages.city });

  if (!updated.length) failed(target, "Those city pages no longer exist. Refresh and try again.");

  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "city.updated", "city_page", cities.join(","), {
    published,
    count: updated.length,
  });

  done(
    target,
    `${updated.length} city page${updated.length === 1 ? "" : "s"} ${published ? "shown" : "hidden"}.`,
  );
}

/**
 * Sets the stored total to the number of venues actually recorded for the city.
 *
 * The total drives the results line and the pager, and drifts as venues are
 * added, so it is worth being able to correct without counting by hand.
 */
export async function syncCityTotalAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin");
  const db = await requireDb();

  const city = String(formData.get("city") || "").toLowerCase();
  if (!CITY_SLUG.test(city)) failed(CITIES_PATH, "That city page could not be identified.");
  const target = `${CITIES_PATH}/${city}`;

  const existing = (await db.select().from(cityPages).where(eq(cityPages.city, city)).limit(1))[0];
  if (!existing) failed(CITIES_PATH, "That city page no longer exists.");

  const [counted] = await db
    .select({ total: sql<number>`count(*)` })
    .from(hotels)
    .where(and(eq(hotels.city, city), eq(hotels.status, "published")));
  const total = Number(counted?.total ?? 0);

  if (total === existing.totalVenues) done(target, `The total is already ${total}.`);

  await db.update(cityPages).set({ totalVenues: total, updatedAt: new Date() }).where(eq(cityPages.city, city));
  invalidateTemplateCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  await recordAudit(db, actor, "city.updated", "city_page", city, {
    totalVenues: { from: existing.totalVenues, to: total },
  });

  done(target, `Total set to ${total} published venue${total === 1 ? "" : "s"} in ${city}.`);
}
