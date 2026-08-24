/**
 * Intrinsic image dimensions, for stamping `width`/`height` onto `<img>` tags.
 *
 * Every image on the site is served from `/media/<key>`, and the `media` table
 * already carries `width`/`height` alongside every row -- but nothing reads
 * them back out. Without them the browser has no box to reserve before the
 * image arrives, so content jumps as each one loads in: a mechanical,
 * site-wide Cumulative Layout Shift failure. A row with `width` or `height`
 * still at its `0` default (not yet backfilled -- see
 * `scripts/backfill-media-dimensions.mjs`) is treated as unknown and its
 * image tag is left exactly as it was.
 */
import { getDb, type DatabaseEnv } from "../db/client";
import { media } from "../db/schema";
import { onContentChanged } from "./content-version";

export interface ImageDimensions {
  width: number;
  height: number;
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; byKey: Map<string, ImageDimensions> } | null = null;

onContentChanged(() => {
  cache = null;
});

async function loadDimensions(env: DatabaseEnv): Promise<Map<string, ImageDimensions>> {
  const db = await getDb(env);
  if (!db) return new Map();

  const rows = await db
    .select({ key: media.key, width: media.width, height: media.height })
    .from(media);

  const byKey = new Map<string, ImageDimensions>();
  for (const row of rows) {
    if (row.width > 0 && row.height > 0) byKey.set(row.key, { width: row.width, height: row.height });
  }
  return byKey;
}

export async function loadMediaDimensions(env: DatabaseEnv = {}): Promise<Map<string, ImageDimensions>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.byKey;

  try {
    const byKey = await loadDimensions(env);
    cache = { at: Date.now(), byKey };
    return byKey;
  } catch {
    // Stale data beats none; an unreachable database should cost freshness,
    // not the dimensions the page already had cached.
    return cache?.byKey ?? new Map();
  }
}
