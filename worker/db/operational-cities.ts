/**
 * The cities a fresh database ships with selectable.
 *
 * Every city picker on the site -- the header mega-menu, the venue filter on
 * /hotel-listing, `#citySelect` on the cost calculators, the Choose Hotels
 * rows on /check-hotel-availability and the select2 on /compare-hotel -- shows
 * the cities whose `calculator_cities.published` is 1. That column is the
 * single switch, and the admin panel owns it: turning a city back on at
 * /admin/calculator is a click and needs no deploy.
 *
 * This list exists because a *new* database has no such column to read yet.
 * seedCalculatorData() imports the bundled dataset into empty tables and used
 * to publish all 45 of its cities, so a fresh install came up offering cities
 * the live site does not work in. It now publishes these and hides the rest,
 * which is the same state drizzle-pg/0009_hide_nonoperational_cities.sql puts
 * an existing database into.
 *
 * The two must agree, or a rebuilt database silently differs from the live one
 * -- tests/operational-cities.test.mjs is what holds them together.
 *
 * Hidden is not retired. These cities keep their hotels, their prices and
 * their /destination-wedding/<city>/ pages, which stay live and indexed; they
 * are simply not offered as a choice. A city withdrawn for good goes through
 * scripts/lib/retired-cities.mjs instead, which deletes all of it.
 */

/**
 * Ids are `calculator_cities.id` -- the original dataset's ids, which are also
 * the mega-menu's `city-tab-<id>` and the venue filter's `<option value>`.
 * They are never renumbered, so matching on them is exact in a way matching on
 * the printed name is not: three of the hidden cities are spelled lowercase in
 * the data ("kerala", "kasauli", "khimsar"), and "Bengal" and "Kolkata" are two
 * separate rows that a name match would be tempted to treat as one.
 */
export const OPERATIONAL_CITY_IDS: readonly number[] = [
  3, // Udaipur
  4, // Delhi NCR
  5, // Jaipur
  6, // Jodhpur
  7, // Goa
  8, // Agra
  9, // Jaisalmer
  10, // Mussoorie
  11, // Rishikesh
  12, // Jim Corbett
  13, // Chandigarh
  14, // Shimla
  15, // Dehradun
  30, // Pushkar
  32, // Ajmer
  33, // Ranthambore
];

const OPERATIONAL = new Set(OPERATIONAL_CITY_IDS);

/** Whether a fresh database should ship this city selectable. */
export function isOperationalCity(id: number): boolean {
  return OPERATIONAL.has(Number(id));
}
