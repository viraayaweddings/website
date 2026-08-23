/**
 * The dataset behind /hotel-listing's filters and the header search box.
 *
 * Both read `/data/hotel-listing-data.json`. That used to be a generated file
 * under site-public: 53 cities and 259 venue cards, frozen at the moment it was
 * written. Renaming a venue in the panel, changing its thumbnail, retagging it
 * or unpublishing it changed the venue page and left the listing filtering on
 * the old copy, with nothing to say the two disagreed.
 *
 * Every field is now derived from rows an admin owns:
 *
 *   id        hotels.external_hotel_id -- the same id the calculator joins on
 *   name      hotels.name
 *   city      the calculator city's name
 *   city_id   calculator_hotels.city_id
 *   rooms     calculator_hotels.total_rooms
 *   capacity  hotels.card_pax, falling back to guest_capacity, as the cards print it
 *   image     hotels.thumbnail_image
 *   url       /destination-wedding/<city>/<slug>
 *   types     hotels.wedding_types
 *   search    name + city, lowercased, which is all the client matches on
 *
 * Order comes from hotels.listing_position.
 *
 * The shape is fixed by two scripts that cannot be changed per page, so the
 * keys stay exactly as they were -- including `search`, which the client could
 * compute but does not.
 */
import { loadCalculatorConfig } from "./calculator-store";
import { loadHotels } from "./hotel";
import { buildVenueListingData, type VenueListingData } from "./venue-listing-payload";

export type { VenueListingCard, VenueListingData } from "./venue-listing-payload";

export async function loadVenueListingData(): Promise<VenueListingData> {
  const [venues, calculator] = await Promise.all([loadHotels({}), loadCalculatorConfig()]);
  return buildVenueListingData(venues, calculator);
}
