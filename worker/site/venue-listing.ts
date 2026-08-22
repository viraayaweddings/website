/**
 * Venue cards shared by the city index pages and the nearby-venues strip.
 *
 * Which venues appear is stored (city pages list a curated subset, and each
 * venue page has its own nearby selection), but the name, image and figures on
 * each card come from the venue's own row, so a rename propagates everywhere.
 */
import { asc } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { cityListings, type Hotel } from "../db/schema";
import { escapeHtml } from "./hero";
import { renderLabel, type ResolvedLabels } from "./labels";

/**
 * City cards print just the place ("Agra") while the nearby strip prints the
 * full location ("Agra, India"), so the stored label holds the longer form.
 */
export function shortLocation(label: string): string {
  return label.split(",")[0].trim();
}

/** Cards shorten long names on a word boundary; the templates use 28 characters. */
/** City pages show this many venues before paginating onto /hotel-listing. */
export const CITY_PAGE_SIZE = 12;

export const CARD_NAME_LIMIT = 28;

export function shortenName(name: string, limit = CARD_NAME_LIMIT): string {
  if (name.length <= limit) return name;

  let out = "";
  for (const word of name.split(" ")) {
    const candidate = out ? `${out} ${word}` : word;
    if (candidate.length > limit) break;
    out = candidate;
  }

  return out.trim();
}

/** Button wording, falling back to the shipped text when nothing is stored. */
function buttonLabel(labels: ResolvedLabels | undefined, key: string, fallback: string): string {
  if (!labels) return escapeHtml(fallback);
  return renderLabel(labels, key, "").html || escapeHtml(fallback);
}

function venueHref(hotel: Hotel): string {
  return `/destination-wedding/${hotel.city}/${hotel.slug}`;
}

/** A card on a city index page. */
export function renderCityCard(hotel: Hotel, labels?: ResolvedLabels): string {
  const href = escapeHtml(venueHref(hotel));
  const name = escapeHtml(hotel.name);

  return `<div class="col-xxl-4 col-xl-6 col-lg-6 col-md-6">
    <div class="hotel-card">
        <a href="${href}">
            <img src="${escapeHtml(hotel.thumbnailImage)}" class="img-fluid hotel-img" alt="${name}" decoding="async" loading="lazy">
        </a>
        <div class="content">
            <a href="${href}">
                <h4 class="font-family01 fs-16 fw-500 mb-0 text-maroon-900"
                    title="${name}">
                    ${escapeHtml(shortenName(hotel.name))}
                </h4>
            </a>
            <p class="text-muted mb-2">
                <img src="/media/legacy/128f0249f07c980b.svg" width="14" alt="" decoding="async" loading="lazy">
                ${escapeHtml(shortLocation(hotel.cityLabel))}
            </p>
            <div class="d-flex flex-wrap align-items-center gap-3 mb-4">
                <span class="text-warning fw-semibold">
                    <i class="fa fa-solid fa-bed"></i>
                    ${escapeHtml(hotel.totalRooms)} Rooms
                </span>
                <span class="text-warning fw-semibold">
                    <i class="fa-solid fa-users" aria-hidden="true"></i>
                    ${escapeHtml(hotel.cardPax || hotel.guestCapacity)} Pax
                </span>
                <!--<i class="fa-solid fa-circle" style="font-size:6px;color:#ccc;"></i>-->
                <!--<span class="text-muted">-->
                <!--    <i class="fa-regular fa-building"></i>-->
                <!--    ${escapeHtml(hotel.venueCategory)}-->
                <!--</span>-->
            </div>
            <div class="d-flex gap-2">
                <a href="${href}" class="btn sm-btn font-family02 fw-600 fs-10 btn-details">${buttonLabel(labels, "card.details", "DETAILS")}</a>
                <a href="/check-hotel-availability" class="btn sm-btn font-family02 fw-600 fs-10 btn-availability">${buttonLabel(labels, "card.availability", "CHECK AVAILABILITY")}</a>
            </div>
        </div>
    </div>
</div>`;
}

/** A card in the "Browse Similar Hotels" strip at the foot of a venue page. */
export function renderNearbyCard(hotel: Hotel, labels?: ResolvedLabels): string {
  const href = escapeHtml(venueHref(hotel));
  const name = escapeHtml(hotel.name);

  return `<div class="col-lg-3" data-aos="fade-up">
    <div class="venue-card bg-white border-0 h-100">
        <a class="venue-img d-block" href="${href}">
            <img src="${escapeHtml(hotel.thumbnailImage)}" class="w-100 img-fluid" alt="${name}" decoding="async" loading="lazy">
        </a>
        <div class="p-3 venue-content">
            <div class="">
                <h5 class="venue-title fs-16 fw-500 text-maroon-900 font-family01">${escapeHtml(shortenName(hotel.name))}</h5>
                <p class="venue-location fs-13 d-flex align-items-center">
                    <img src="/media/legacy/128f0249f07c980b.svg" width="14" height="14" alt="" decoding="async" loading="lazy"> ${escapeHtml(hotel.cityLabel)}
                </p>
            </div>
            <div class="d-flex gap-2-custom mt-3-custom">
                <a href="${href}" class="btn sm-btn font-family02 fw-600 fs-10 btn-details">${buttonLabel(labels, "card.details", "DETAILS")}</a>
                <a href="/check-hotel-availability" class="btn sm-btn font-family02 fw-600 fs-10 btn-availability">${buttonLabel(labels, "card.availability", "CHECK AVAILABILITY")}</a>
            </div>
        </div>
    </div>
</div>`;
}

/** The site's own empty state for a city that lists no venues. */
export const NO_VENUES_MARKUP = `<div class="col-12">
    <div class="text-center py-5">
        <h4>No hotels found matching your criteria.</h4>
        <a href="/hotel-listing" class="btn btn-primary mt-3">Clear Filters</a>
    </div>
</div>`;

export function renderCityCards(hotels: Hotel[], labels?: ResolvedLabels): string {
  if (!hotels.length) return NO_VENUES_MARKUP;
  return hotels.map((hotel) => renderCityCard(hotel, labels)).join("\n");
}

/** "Showing 1 - 12 of 30 hotels", or zeroes when the city lists nothing. */
export function renderResultsSummary(total: number, perPage = CITY_PAGE_SIZE): string {
  const first = total === 0 ? 0 : 1;
  return `Showing ${first} \u2013 ${Math.min(total, perPage)} of ${total} hotels`;
}

/**
 * The pager beneath a city's venues. Pages beyond the first live on
 * /hotel-listing, which is where the original markup points them.
 */
export function renderPagination(total: number, cityId: string, perPage = CITY_PAGE_SIZE): string {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return "";

  const href = (page: number) =>
    `/hotel-listing?city_ids%5B0%5D=${encodeURIComponent(cityId)}&amp;page=${page}`;

  const numbers = [];
  for (let page = 2; page <= pages; page += 1) {
    numbers.push(`<a href="${href(page)}" class="page-btn">${page}</a>`);
  }

  return `<div class="d-flex justify-content-center align-items-center gap-2 flex-wrap mt-4 custom-pagination">
    <span class="page-btn disabled"><i class="fa-light fa-angle-left"></i></span>
    <span class="page-btn active">1</span>
    ${numbers.join("\n    ")}
    <a href="${href(2)}" class="page-btn"><i class="fa-light fa-angle-right"></i></a>
</div>`;
}

export function renderNearbyCards(hotels: Hotel[], labels?: ResolvedLabels): string {
  return hotels.map((hotel) => renderNearbyCard(hotel, labels)).join("\n");
}

/** Resolves "city/slug" references against the loaded venues, preserving order. */
export function resolveVenues(refs: string[], hotels: Hotel[]): Hotel[] {
  const byKey = new Map(hotels.map((hotel) => [`${hotel.city}/${hotel.slug}`, hotel]));
  return refs.map((ref) => byKey.get(ref)).filter((hotel): hotel is Hotel => Boolean(hotel));
}

export function parseNearby(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** The city index page path, e.g. "/destination-wedding/agra/". */
export function cityFromListingPath(pathname: string): string {
  if (!pathname.startsWith("/destination-wedding/")) return "";

  const segments = pathname.slice("/destination-wedding/".length).split("/").filter(Boolean);
  const usable = segments[segments.length - 1] === "index.html" ? segments.slice(0, -1) : segments;
  if (usable.length !== 1) return "";

  return /^[a-z0-9-]+$/i.test(usable[0]) ? usable[0] : "";
}

const CACHE_TTL_MS = 30_000;
let cache: { at: number; rows: { city: string; venueCity: string; venueSlug: string }[] } | null = null;

export function invalidateCityListingCache(): void {
  cache = null;
}

/** Every city listing row, ordered. Empty on failure so pages stay untouched. */
export async function loadCityListings(env: DatabaseEnv) {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.rows;

  try {
    const db = await getDb(env);
    if (!db) return [];

    const rows = await db
      .select({
        city: cityListings.city,
        venueCity: cityListings.venueCity,
        venueSlug: cityListings.venueSlug,
      })
      .from(cityListings)
      .orderBy(asc(cityListings.city), asc(cityListings.position));

    cache = { at: now, rows };
    return rows;
  } catch (error) {
    console.error("[venue-listing] load failed", error instanceof Error ? error.message : error);
    return cache?.rows ?? [];
  }
}

export async function venuesForCity(env: DatabaseEnv, city: string, hotels: Hotel[]): Promise<Hotel[]> {
  const rows = await loadCityListings(env);
  const refs = rows.filter((row) => row.city === city).map((row) => `${row.venueCity}/${row.venueSlug}`);
  return resolveVenues(refs, hotels);
}
