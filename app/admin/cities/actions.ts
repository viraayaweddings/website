"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cityListings, cityPages } from "@/worker/db/schema";
import { invalidateCityListingCache } from "@/worker/site/venue-listing";
import { invalidateTemplateCache } from "@/worker/site/template";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const CITIES_PATH = "/admin/cities";

function failed(city: string, message: string): never {
  redirect(`${CITIES_PATH}/${city}?error=${encodeURIComponent(message)}`);
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
      const valid = /^[a-z0-9-]+$/i.test(entry.venueCity) && /^[a-z0-9-]+$/i.test(entry.venueSlug);
      if (!valid || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** City pages are site-wide structure, so editing them is admin-only. */
export async function saveCityAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const city = String(formData.get("city") || "");
  if (!/^[a-z0-9-]+$/i.test(city)) redirect(CITIES_PATH);

  const existing = (await db.select().from(cityPages).where(eq(cityPages.city, city)).limit(1))[0];
  if (!existing) failed(city, "That city page no longer exists.");

  const seoTitle = String(formData.get("seoTitle") || "").trim().slice(0, 300);
  if (!seoTitle) failed(city, "Enter the page title.");

  const total = Number.parseInt(String(formData.get("totalVenues") || "0"), 10);
  const venues = readVenues(formData, city);

  await db
    .update(cityPages)
    .set({
      seoTitle,
      metaDescription: String(formData.get("metaDescription") || "").trim().slice(0, 500),
      cityId: String(formData.get("cityId") || "").trim().slice(0, 20),
      // Drives the "Showing 1 - 12 of N" line and the pager.
      totalVenues: Number.isFinite(total) && total >= 0 ? total : venues.length,
    })
    .where(eq(cityPages.city, city));

  // Replace the list wholesale: order matters and is easiest to express as the
  // order the lines were typed in.
  await db.delete(cityListings).where(eq(cityListings.city, city));
  for (const [position, venue] of venues.entries()) {
    await db.insert(cityListings).values({ city, ...venue, position });
  }

  invalidateCityListingCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "city.updated", "city_page", city, { venues: venues.length });

  redirect(`${CITIES_PATH}/${city}?saved=1`);
}

