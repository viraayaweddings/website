/**
 * Venue page content, rendered into the site's existing hotel page shell.
 *
 * Only the slots an editor controls are replaced. The nearby-venues strip keeps
 * its stored selection of venues, but each card is rendered from that venue's
 * own row -- see venue-listing.ts.
 */
import { and, asc, eq } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { hotels, type BlogFaq, type Hotel, type HotelHighlight } from "../db/schema";
import { escapeHtml } from "./hero";
import { onContentChanged } from "./content-version";

// Re-exported so the venue-page modules keep importing everything they render
// from one place; the gallery lives apart because it needs no database access
// and is therefore loadable -- and testable -- on its own.
export {
  galleryFor,
  parseGallery,
  renderGallery,
  renderGalleryThumbnails,
} from "./hotel-gallery";

export const HOTEL_PREFIX = "/destination-wedding/";

/**
 * Shell used for venues added in the admin panel, which have no file of their
 * own. Requested as a directory URL: the asset layer answers the
 * "/index.html" form with a 307 to the pretty URL.
 */
export const HOTEL_SHELL_PATH = "/destination-wedding/agra/itc-mughal-agra/";

const CACHE_TTL_MS = 30_000;
let cache: { at: number; hotels: Hotel[] } | null = null;

export function invalidateHotelCache(): void {
  cache = null;
}

export interface HotelPath {
  city: string;
  slug: string;
}

/**
 * Splits a venue URL into city and slug. City index pages (a single segment)
 * and anything malformed return null.
 */
export function hotelPathFrom(pathname: string): HotelPath | null {
  if (!pathname.startsWith(HOTEL_PREFIX)) return null;

  const segments = pathname.slice(HOTEL_PREFIX.length).split("/").filter(Boolean);
  const usable = segments[segments.length - 1] === "index.html" ? segments.slice(0, -1) : segments;
  if (usable.length !== 2) return null;

  const [city, slug] = usable;
  const valid = /^[a-z0-9-]+$/i;
  return valid.test(city) && valid.test(slug) ? { city, slug } : null;
}

export function parseHighlights(value: string): HotelHighlight[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Boolean(item) && typeof item === "object")
      .map((item) => ({ image: String(item.image ?? ""), title: String(item.title ?? "") }))
      .filter((item) => item.image && item.title);
  } catch {
    return [];
  }
}

/**
 * A highlight tile. The markup mirrors the static pages, which lay these out
 * three to a row.
 */
export function renderHighlights(highlights: HotelHighlight[]): string {
  return highlights
    .map(
      (highlight) => `<div class="col-md-4" data-aos="fade-up">
    <div class="item">
        <figure class="img-widget overflow-hidden">
            <img src="${escapeHtml(highlight.image)}" class="w-100 img-fluid" alt="${escapeHtml(highlight.title)}" decoding="async" loading="lazy">
        </figure>
        <h4 class="fs-14 fw-400 font-family01">${escapeHtml(highlight.title)}</h4>
    </div>
</div>`,
    )
    .join("\n");
}

/**
 * The questions accordion. Venue pages use their own markup: plain `faq<id>`
 * anchors, a `#weddingFAQ` parent and a data-aos attribute per item.
 */
export function renderHotelFaqItems(faqs: BlogFaq[]): string {
  return faqs
    .map(
      (faq, index) => `<div class="accordion-item ${index === 0 ? "active" : ""}" data-aos="fade-up">
    <h2 class="accordion-header font-family01">
        <button class="accordion-button ${index === 0 ? "" : "collapsed"}" type="button"
                data-bs-toggle="collapse"
                data-bs-target="#faq${faq.id}">
            ${escapeHtml(faq.question)}
        </button>
    </h2>
    <div id="faq${faq.id}"
         class="accordion-collapse collapse ${index === 0 ? "show" : ""}"
         data-bs-parent="#weddingFAQ">
        <div class="accordion-body">
            ${faq.answer}
        </div>
    </div>
</div>`,
    )
    .join("\n");
}

/**
 * The lightbox gallery: the banner first, then one figure per highlight. It
 * repeats images already stored on the venue, so it is generated rather than
 * kept as separate data.
 */
/** Published venues. Empty on failure, so callers leave the page untouched. */
export async function loadHotels(env: DatabaseEnv): Promise<Hotel[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.hotels;

  try {
    const db = await getDb(env);
    if (!db) return [];

    const rows = await db
      .select()
      .from(hotels)
      .where(eq(hotels.status, "published"))
      .orderBy(asc(hotels.city), asc(hotels.name));

    cache = { at: now, hotels: rows };
    return rows;
  } catch (error) {
    console.error("[hotel] load failed", error instanceof Error ? error.message : error);
    return cache?.hotels ?? [];
  }
}

export async function loadHotel(env: DatabaseEnv, path: HotelPath): Promise<Hotel | null> {
  const rows = await loadHotels(env);
  return rows.find((hotel) => hotel.city === path.city && hotel.slug === path.slug) ?? null;
}

/** Direct lookup for the admin panel, which also needs unpublished rows. */
export async function findHotel(env: DatabaseEnv, id: number): Promise<Hotel | null> {
  const db = await getDb(env);
  if (!db) return null;
  const rows = await db.select().from(hotels).where(eq(hotels.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findHotelByPath(env: DatabaseEnv, path: HotelPath): Promise<Hotel | null> {
  const db = await getDb(env);
  if (!db) return null;
  const rows = await db
    .select()
    .from(hotels)
    .where(and(eq(hotels.city, path.city), eq(hotels.slug, path.slug)))
    .limit(1);
  return rows[0] ?? null;
}

// Dropped when any instance publishes a content change, not just this one.
// See worker/site/content-version.ts.
onContentChanged(() => {
  invalidateHotelCache();
});
