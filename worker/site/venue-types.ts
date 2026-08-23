/**
 * The wedding-type vocabulary.
 *
 * Read by three things that used to hold their own copy: the filter checkboxes
 * on /hotel-listing and the 53 city index pages, the tag checkboxes on the
 * venue form in the admin panel, and the `types` array in the listing dataset.
 * One table, so a type added in the panel appears in all three.
 *
 * Its own module rather than part of venue-listing.ts: the injection needs it
 * on every render and should not pull in the card renderers to get it.
 */
import { asc } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { venueTypes } from "../db/schema";
import { onContentChanged } from "./content-version";

export interface VenueTypeOption {
  /** The `wedding_types[]=N` value; load-bearing in existing listing URLs. */
  id: number;
  slug: string;
  label: string;
}

const CACHE_TTL_MS = 30_000;
let cache: { at: number; types: VenueTypeOption[] } | null = null;

export function invalidateVenueTypeCache(): void {
  cache = null;
}

onContentChanged(() => {
  invalidateVenueTypeCache();
});

/**
 * Published types, in display order.
 *
 * An unreadable database yields the last good copy, or an empty list. Empty
 * means the filter is absent rather than wrong, which is the same trade the
 * calculator's city picker makes.
 */
export async function loadVenueTypes(env: DatabaseEnv = {}): Promise<VenueTypeOption[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.types;

  try {
    const db = await getDb(env);
    if (!db) return cache?.types ?? [];

    const rows = await db
      .select()
      .from(venueTypes)
      .orderBy(asc(venueTypes.position), asc(venueTypes.label));

    const types = rows
      .filter((row) => row.published === 1)
      .map((row) => ({ id: row.id, slug: row.slug, label: row.label }));

    cache = { at: now, types };
    return types;
  } catch (error) {
    console.error("[venue-types] load failed", error instanceof Error ? error.message : error);
    return cache?.types ?? [];
  }
}

/** Every row, published or not. The admin list needs the hidden ones too. */
export async function loadAllVenueTypes(env: DatabaseEnv = {}) {
  const db = await getDb(env);
  if (!db) return [];
  return db.select().from(venueTypes).orderBy(asc(venueTypes.position), asc(venueTypes.label));
}

// Lives with the payload builder, which must stay free of runtime imports so it
// can be tested without the database client. Re-exported so callers that want
// "the venue types module" find it here.
export { parseWeddingTypes } from "./venue-listing-payload";
