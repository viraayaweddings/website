/**
 * Assembles /data/hotel-listing-data.json from the rows that replaced it.
 *
 * Its own module, for the same reason escape.ts is: this is pure mapping, and
 * keeping it clear of the database client is what lets tests load it. The check
 * that matters -- that the payload still matches the generated file it replaced,
 * field for field and in order -- lives in tests/venue-listing-data.test.mjs and
 * would be impossible otherwise.
 *
 * Field-by-field provenance is on loadVenueListingData in venue-listing-data.ts.
 */
import type { Hotel } from "../db/schema";
import type { CalculatorConfig } from "./calculator-store";

export interface VenueListingCard {
  id: number;
  name: string;
  city: string;
  city_id: number;
  rooms: number;
  capacity: number;
  image: string;
  url: string;
  types: string[];
  search: string;
}

export interface VenueListingData {
  cities: Array<{ id: number; name: string }>;
  hotels: VenueListingCard[];
}

/**
 * Tags are stored as a JSON array of `venue_types.slug`; anything else reads as
 * untagged. Defined here rather than in venue-types.ts so this module keeps no
 * runtime imports at all.
 */
export function parseWeddingTypes(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => String(entry)).filter(Boolean);
  } catch {
    return [];
  }
}

/** Only the venue columns this reads, so a test need not build a whole row. */
export type VenueRow = Pick<
  Hotel,
  | "name"
  | "city"
  | "slug"
  | "externalHotelId"
  | "cardPax"
  | "guestCapacity"
  | "thumbnailImage"
  | "weddingTypes"
  | "listingPosition"
>;

/** Only the calculator fields this reads. */
export type CalculatorInputs = Pick<CalculatorConfig, "cities" | "cityByHotel" | "roomsByHotel">;

/**
 * A figure the filters compare numerically.
 *
 * `card_pax` and `guest_capacity` are free text -- a handful of venues describe
 * capacity in prose -- so the leading number is taken and anything without one
 * counts as zero, which is what the generated file did and what keeps a range
 * filter honest.
 */
function toNumber(value: string): number {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function buildVenueListingData(
  venues: VenueRow[],
  calculator: CalculatorInputs,
): VenueListingData {
  const cityName = new Map(calculator.cities.map((city) => [city.id, city.name]));

  const placed: Array<{ position: number; card: VenueListingCard }> = [];
  for (const venue of venues) {
    const externalId = venue.externalHotelId.trim();
    // A venue with no calculator link has no city id and no room count, so it
    // could only ever be filtered out. Leaving it out of the payload is the
    // same outcome, minus a card that vanishes the moment anyone filters.
    if (!externalId) continue;

    const cityId = calculator.cityByHotel[externalId];
    if (cityId === undefined) continue;

    const city = cityName.get(cityId);
    if (city === undefined) continue;

    const name = venue.name;
    placed.push({
      position: venue.listingPosition,
      card: {
        id: Number(externalId),
        name,
        city,
        city_id: cityId,
        rooms: calculator.roomsByHotel[externalId] ?? 0,
        capacity: toNumber(venue.cardPax || venue.guestCapacity),
        image: venue.thumbnailImage,
        url: `/destination-wedding/${venue.city}/${venue.slug}`,
        types: parseWeddingTypes(venue.weddingTypes),
        search: `${name} ${city}`.toLowerCase(),
      },
    });
  }

  // The pages present this in the order it arrives, so the stored order is the
  // whole of it. Ties break on name, so a run of unplaced venues is at least
  // stable between requests.
  placed.sort(
    (a, b) =>
      a.position - b.position ||
      a.card.name.localeCompare(b.card.name, "en", { sensitivity: "base" }),
  );

  return { cities: calculator.cities, hotels: placed.map((entry) => entry.card) };
}
