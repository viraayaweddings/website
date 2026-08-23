/**
 * Imports the cached Vivahnam calculator dataset into Postgres in small
 * committed batches.
 *
 * Use scripts/fetch-vivahnam-calculator.ps1 first when Node TLS is intercepted
 * locally, then run this script with DATABASE_URL pointing at the target Neon DB.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const CACHE_PATH = join("tmp", "vivahnam-calculator-source.json");
const INDIA_COUNTRY_ID = 2;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(value) {
  return Number(value || 0).toFixed(2);
}

function chunks(rows, size) {
  const out = [];
  for (let index = 0; index < rows.length; index += size) out.push(rows.slice(index, index + size));
  return out;
}

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("Set DATABASE_URL or POSTGRES_URL.");
  process.exit(1);
}

const source = JSON.parse((await readFile(CACHE_PATH, "utf8")).replace(/^\uFEFF/, ""));
const indiaCityIds = new Set(
  source.cities
    .filter((city) => Number(city.countryId || 0) === INDIA_COUNTRY_ID)
    .map((city) => String(city.id)),
);

const cities = source.cities
  .filter((city) => indiaCityIds.has(String(city.id)))
  .map((city) => ({
    id: Number(city.id),
    name: String(city.name || ""),
    published: Number(city.published || 0),
    position: Number(city.position || 0),
  }));

const hotels = source.hotels
  .filter((hotel) => indiaCityIds.has(String(hotel.cityId)))
  .map((hotel) => ({
    id: Number(hotel.id),
    city_id: Number(hotel.cityId),
    name: String(hotel.name || ""),
    total_rooms: Number(hotel.totalRooms || 0),
    published: 1,
    position: 9999,
  }));

const hotelIds = new Set(hotels.map((hotel) => String(hotel.id)));
const prices = [];
for (const [hotelId, byMonth] of Object.entries(source.prices || {})) {
  if (!hotelIds.has(String(hotelId))) continue;
  for (const month of MONTHS) {
    const cell = byMonth?.[month] || {};
    prices.push({
      hotel_id: Number(hotelId),
      month,
      room_price: money(cell.room_price),
      lunch_price: money(cell.lunch_price),
      hitea_price: money(cell.hitea_price),
      dinner_price: money(cell.dinner_price),
    });
  }
}

const currencies = (source.currencies || []).map((currency, index) => ({
  code: String(currency.code || "").toUpperCase(),
  name: String(currency.name || ""),
  symbol: String(currency.symbol || ""),
  rate_to_usd: String(currency.rateToUsd || "1"),
  is_default: String(currency.code || "").toUpperCase() === "INR" ? 1 : 0,
  position: index,
}));

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL_NO_VERIFY === "true" ? "require" : { rejectUnauthorized: true },
  connect_timeout: 20,
});

try {
  for (const batch of chunks(cities, 100)) {
    await sql`
      insert into calculator_cities ${sql(batch)}
      on conflict (id) do update
        set name = excluded.name,
            published = excluded.published,
            position = excluded.position,
            updated_at = now()
    `;
  }
  console.log(`[calculator-import] cities: ${cities.length}`);

  for (const batch of chunks(hotels, 100)) {
    await sql`
      insert into calculator_hotels ${sql(batch)}
      on conflict (id) do update
        set city_id = excluded.city_id,
            name = excluded.name,
            total_rooms = excluded.total_rooms,
            published = excluded.published,
            updated_at = now()
    `;
  }
  console.log(`[calculator-import] hotels: ${hotels.length}`);

  for (const batch of chunks(prices, 250)) {
    await sql`
      insert into calculator_prices ${sql(batch)}
      on conflict (hotel_id, month) do update
        set room_price = excluded.room_price,
            lunch_price = excluded.lunch_price,
            hitea_price = excluded.hitea_price,
            dinner_price = excluded.dinner_price,
            updated_at = now()
    `;
  }
  console.log(`[calculator-import] prices: ${prices.length}`);

  await sql`update calculator_currencies set is_default = 0`;
  for (const batch of chunks(currencies, 100)) {
    await sql`
      insert into calculator_currencies ${sql(batch)}
      on conflict (code) do update
        set name = excluded.name,
            symbol = excluded.symbol,
            rate_to_usd = excluded.rate_to_usd,
            is_default = excluded.is_default,
            position = excluded.position,
            updated_at = now()
    `;
  }
  console.log(`[calculator-import] currencies: ${currencies.length}`);

  await sql`
    update calculator_cities
    set published = 0, updated_at = now()
    where not id = any(${cities.map((city) => city.id)})
  `;
  await sql`
    update calculator_hotels
    set published = 0, updated_at = now()
    where city_id = any(${cities.map((city) => city.id)})
      and not id = any(${hotels.map((hotel) => hotel.id)})
  `;
  await sql`
    insert into content_version (id, version, updated_at)
    values (1, 1, now())
    on conflict (id) do update
      set version = content_version.version + 1, updated_at = now()
  `;
  console.log(`[calculator-import] source fetched at ${source.fetchedAt}`);
} finally {
  await sql.end({ timeout: 5 });
}
