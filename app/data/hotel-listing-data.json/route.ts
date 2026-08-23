/**
 * /data/hotel-listing-data.json, built from the database.
 *
 * A generated file under site-public used to serve this: 53 cities and 259
 * venue cards frozen at the moment it was written. site-public/js/hotel-listing.js
 * filters and pages through it on /hotel-listing and the 53 city index pages,
 * and site-public/js/site-search.js falls back to it when /hotel-search cannot
 * be reached -- so a rename, a new thumbnail, a retag or an unpublish in the
 * panel reached the venue page and nothing else.
 *
 * The file is deleted. Everything here comes from rows an admin owns; see
 * worker/site/venue-listing-data.ts for the field-by-field mapping.
 */
import { CALCULATOR_CACHE_CONTROL } from "@/worker/site/calculator-store";
import { loadVenueListingData } from "@/worker/site/venue-listing-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const data = await loadVenueListingData();

  return Response.json(data, {
    headers: { "cache-control": CALCULATOR_CACHE_CONTROL },
  });
}
