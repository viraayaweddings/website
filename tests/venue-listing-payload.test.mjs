import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildVenueListingData } from "../worker/site/venue-listing-payload.ts";

/**
 * /data/hotel-listing-data.json, rebuilt from the columns that replaced it.
 *
 * The endpoint used to be a generated file. tests/fixtures/hotel-listing-before.json
 * is that file as it last shipped; these tests feed the builder the database
 * rows the migration created from it and assert the payload comes back
 * unchanged, field for field and in the same order.
 *
 * That is the check that matters. /hotel-listing filters and pages entirely on
 * this shape, and site-search.js falls back to it, so a renamed key or a
 * reordered list is a broken page rather than a failing assertion somewhere.
 */
const before = JSON.parse(readFileSync("tests/fixtures/hotel-listing-before.json", "utf8"));

/** The rows migration 0008 and the existing venue columns hold, per venue. */
function rowsFrom(source) {
  const venues = source.hotels.map((card, index) => {
    const [, , city, slug] = card.url.split("/");
    return {
      name: card.name,
      city,
      slug,
      externalHotelId: String(card.id),
      // The card figure is what `card_pax` holds, with `guest_capacity` behind it.
      cardPax: String(card.capacity),
      guestCapacity: "",
      thumbnailImage: card.image,
      weddingTypes: JSON.stringify(card.types),
      listingPosition: index,
    };
  });

  const calculator = {
    cities: source.cities,
    cityByHotel: Object.fromEntries(source.hotels.map((card) => [String(card.id), card.city_id])),
    roomsByHotel: Object.fromEntries(source.hotels.map((card) => [String(card.id), card.rooms])),
  };

  return { venues, calculator };
}

test("the payload matches the file it replaced, exactly", () => {
  const { venues, calculator } = rowsFrom(before);
  // loadHotels orders by city then name; the builder must not depend on that.
  const shuffled = [...venues].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

  const built = buildVenueListingData(shuffled, calculator);

  assert.deepEqual(built.cities, before.cities);
  assert.equal(built.hotels.length, before.hotels.length);
  assert.deepEqual(built.hotels, before.hotels);
});

test("the curated order survives, including the six venues that opened the list", () => {
  const { venues, calculator } = rowsFrom(before);
  const built = buildVenueListingData([...venues].reverse(), calculator);

  assert.deepEqual(
    built.hotels.slice(0, 6).map((card) => card.name),
    before.hotels.slice(0, 6).map((card) => card.name),
    "the list opened with six chosen venues and no rule produced the rest",
  );
});

test("a venue with no calculator link is left out rather than shown unfilterable", () => {
  const { venues, calculator } = rowsFrom(before);
  const orphan = { ...venues[0], name: "Unlinked Venue", externalHotelId: "" };
  const unknown = { ...venues[0], name: "Unknown Id Venue", externalHotelId: "999999" };

  const built = buildVenueListingData([...venues, orphan, unknown], calculator);
  const names = new Set(built.hotels.map((card) => card.name));

  assert.equal(names.has("Unlinked Venue"), false);
  assert.equal(names.has("Unknown Id Venue"), false);
  assert.equal(built.hotels.length, before.hotels.length);
});

test("capacity falls back to the guest figure, and prose counts as zero", () => {
  const { calculator } = rowsFrom(before);
  const sample = before.hotels[0];
  const [, , city, slug] = sample.url.split("/");
  const base = {
    name: sample.name,
    city,
    slug,
    externalHotelId: String(sample.id),
    thumbnailImage: sample.image,
    weddingTypes: "[]",
    listingPosition: 0,
  };

  const withFallback = buildVenueListingData(
    [{ ...base, cardPax: "", guestCapacity: "Approximately 650 to 670 guests" }],
    calculator,
  );
  assert.equal(withFallback.hotels[0].capacity, 650, "the leading number is what a range filter can use");

  const withNeither = buildVenueListingData([{ ...base, cardPax: "", guestCapacity: "" }], calculator);
  assert.equal(withNeither.hotels[0].capacity, 0);
});

test("malformed tags read as untagged rather than throwing", () => {
  const { calculator } = rowsFrom(before);
  const sample = before.hotels[0];
  const [, , city, slug] = sample.url.split("/");
  const built = buildVenueListingData(
    [
      {
        name: sample.name,
        city,
        slug,
        externalHotelId: String(sample.id),
        cardPax: "100",
        guestCapacity: "",
        thumbnailImage: "",
        weddingTypes: "not json",
        listingPosition: 0,
      },
    ],
    calculator,
  );
  assert.deepEqual(built.hotels[0].types, []);
});
