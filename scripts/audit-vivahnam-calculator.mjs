/**
 * Audits this site's calculator tables against the live Vivahnam calculator.
 *
 * Vivahnam does not expose the cloned /api/calculator/data endpoint. Its
 * Laravel site exposes the public calculator surface directly:
 *
 *   GET /get-cities
 *   GET /get-hotels-by-city/:cityId
 *   GET /get-hotel-price/:hotelId/:month
 *   GET /api/currencies
 *
 * This script reads those endpoints, caches the source payload under tmp, and
 * compares it with the local Postgres-backed calculator tables. With --apply it
 * updates matching calculator rows and inserts missing active source rows.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const BASE_URL = "https://www.vivahnam.com";
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

const apply = process.argv.includes("--apply");
const refresh = process.argv.includes("--refresh");
const cacheOnly = process.argv.includes("--cache-only");
const includeInternational = process.argv.includes("--include-international");

function usage() {
  console.log([
    "Usage:",
    "  node --env-file=.env.local scripts/audit-vivahnam-calculator.mjs --refresh",
    "  node --env-file=.env.local scripts/audit-vivahnam-calculator.mjs",
    "  node --env-file=.env.local scripts/audit-vivahnam-calculator.mjs --apply",
    "  node --env-file=.env.local scripts/audit-vivahnam-calculator.mjs --include-international",
    "",
    "--refresh                Fetch Vivahnam endpoints and rewrite tmp/vivahnam-calculator-source.json.",
    "--apply                  Update local calculator tables from tmp/vivahnam-calculator-source.json.",
    "--include-international  Compare all Vivahnam cities. Default scope is India only.",
  ].join("\n"));
}

if (process.argv.includes("--help")) {
  usage();
  process.exit(0);
}

async function getJson(path) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
          accept: "application/json",
          "user-agent": "Viraaya calculator audit",
        },
      });
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 5) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

function priceKey(hotelId, month) {
  return `${hotelId}|${month}`;
}

async function fetchSource() {
  const cities = await getJson("/get-cities");
  const hotelsByCity = {};
  const hotels = [];
  const seenHotels = new Set();

  for (const city of cities) {
    const rows = await getJson(`/get-hotels-by-city/${city.id}`);
    hotelsByCity[String(city.id)] = rows;
    for (const row of rows) {
      if (seenHotels.has(String(row.id))) continue;
      seenHotels.add(String(row.id));
      hotels.push({
        id: Number(row.id),
        cityId: Number(city.id),
        name: String(row.name || ""),
        totalRooms: Number(row.total_rooms || 0),
      });
    }
  }

  const prices = {};
  let fetched = 0;
  for (const hotel of hotels) {
    prices[String(hotel.id)] = {};
    for (const month of MONTHS) {
      prices[String(hotel.id)][month] = await getJson(`/get-hotel-price/${hotel.id}/${month}`);
      fetched += 1;
      if (fetched % 500 === 0) console.log(`[vivahnam] fetched ${fetched} monthly prices`);
    }
  }

  const currencies = await getJson("/api/currencies");
  return {
    fetchedAt: new Date().toISOString(),
    source: BASE_URL,
    cities: cities.map((city) => ({
      id: Number(city.id),
      countryId: Number(city.country_id || 0),
      name: String(city.name || ""),
      published: city.is_active ? 1 : 0,
      position: Number(city.sort_order || 0),
    })),
    hotels,
    prices,
    currencies: currencies.map((currency) => ({
      code: String(currency.code || "").toUpperCase(),
      name: String(currency.name || ""),
      symbol: String(currency.symbol || ""),
      rateToUsd: String(Number(currency.rate_to_usd || 1)),
    })),
  };
}

async function loadSource() {
  if (refresh) {
    const source = await fetchSource();
    await mkdir("tmp", { recursive: true });
    await writeFile(CACHE_PATH, `${JSON.stringify(source, null, 2)}\n`);
    console.log(`[vivahnam] cached ${source.cities.length} cities, ${source.hotels.length} hotels, ${Object.keys(source.prices).length * MONTHS.length} monthly prices`);
    return source;
  }

  const raw = await readFile(CACHE_PATH, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

async function loadDb(sql) {
  const [cities, hotels, prices, currencies] = await Promise.all([
    sql`select id, name, published, position from calculator_cities`,
    sql`select id, city_id, name, total_rooms, published from calculator_hotels`,
    sql`select hotel_id, month, room_price, lunch_price, hitea_price, dinner_price from calculator_prices`,
    sql`select code, name, symbol, rate_to_usd, is_default, position from calculator_currencies`,
  ]);

  return {
    cities: new Map(cities.map((row) => [String(row.id), row])),
    hotels: new Map(hotels.map((row) => [String(row.id), row])),
    prices: new Map(prices.map((row) => [priceKey(row.hotel_id, row.month), row])),
    currencies: new Map(currencies.map((row) => [row.code, row])),
    counts: {
      cities: cities.length,
      hotels: hotels.length,
      prices: prices.length,
      currencies: currencies.length,
    },
  };
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function filterSourceForScope(source, db) {
  if (includeInternational) return { scope: "all", source };

  const countryCityIds = new Set(
    source.cities
      .filter((city) => Number(city.countryId || 0) === INDIA_COUNTRY_ID)
      .map((city) => String(city.id)),
  );
  const cityIds = countryCityIds.size > 0 ? countryCityIds : new Set(db.cities.keys());
  const cities = source.cities.filter((city) => cityIds.has(String(city.id)));
  const hotels = source.hotels.filter((hotel) => cityIds.has(String(hotel.cityId)));
  const hotelIds = new Set(hotels.map((hotel) => String(hotel.id)));
  const prices = Object.fromEntries(
    Object.entries(source.prices).filter(([hotelId]) => hotelIds.has(String(hotelId))),
  );

  return {
    scope: "india",
    source: { ...source, cities, hotels, prices },
  };
}

function sourcePriceRows(source) {
  const rows = [];
  for (const [hotelId, byMonth] of Object.entries(source.prices)) {
    for (const month of MONTHS) {
      const cell = byMonth[month] || {};
      rows.push({
        hotelId: Number(hotelId),
        month,
        roomPrice: money(cell.room_price),
        lunchPrice: money(cell.lunch_price),
        hiteaPrice: money(cell.hitea_price),
        dinnerPrice: money(cell.dinner_price),
      });
    }
  }
  return rows;
}

function compare(source, db) {
  const diff = {
    citiesMissing: [],
    citiesChanged: [],
    citiesExtraPublished: [],
    hotelsMissing: [],
    hotelsChanged: [],
    hotelsExtraPublished: [],
    pricesMissing: [],
    pricesChanged: [],
    currenciesMissing: [],
    currenciesChanged: [],
    sourceHotelsWithNoRoomRate: [],
  };

  for (const city of source.cities) {
    const row = db.cities.get(String(city.id));
    if (!row) diff.citiesMissing.push(city);
    else if (row.name !== city.name || row.published !== city.published || row.position !== city.position) {
      diff.citiesChanged.push({ id: city.id, db: row, source: city });
    }
  }

  const sourceCityIds = new Set(source.cities.map((city) => String(city.id)));
  for (const row of db.cities.values()) {
    if (row.published === 1 && !sourceCityIds.has(String(row.id))) {
      diff.citiesExtraPublished.push(row);
    }
  }

  for (const hotel of source.hotels) {
    const row = db.hotels.get(String(hotel.id));
    if (!row) diff.hotelsMissing.push(hotel);
    else if (
      row.name !== hotel.name ||
      row.city_id !== hotel.cityId ||
      row.total_rooms !== hotel.totalRooms ||
      row.published !== 1
    ) {
      diff.hotelsChanged.push({ id: hotel.id, db: row, source: hotel });
    }

    const hasRoomRate = MONTHS.some((month) => Number(source.prices[String(hotel.id)]?.[month]?.room_price || 0) > 0);
    if (!hasRoomRate) diff.sourceHotelsWithNoRoomRate.push(hotel);
  }

  const sourceHotelIds = new Set(source.hotels.map((hotel) => String(hotel.id)));
  for (const row of db.hotels.values()) {
    if (row.published === 1 && sourceCityIds.has(String(row.city_id)) && !sourceHotelIds.has(String(row.id))) {
      diff.hotelsExtraPublished.push(row);
    }
  }

  for (const price of sourcePriceRows(source)) {
    const row = db.prices.get(priceKey(price.hotelId, price.month));
    if (!row) diff.pricesMissing.push(price);
    else if (
      row.room_price !== price.roomPrice ||
      row.lunch_price !== price.lunchPrice ||
      row.hitea_price !== price.hiteaPrice ||
      row.dinner_price !== price.dinnerPrice
    ) {
      diff.pricesChanged.push({ key: priceKey(price.hotelId, price.month), db: row, source: price });
    }
  }

  for (const currency of source.currencies) {
    const row = db.currencies.get(currency.code);
    if (!row) diff.currenciesMissing.push(currency);
    else if (
      row.name !== currency.name ||
      row.symbol !== currency.symbol ||
      String(Number(row.rate_to_usd)) !== String(Number(currency.rateToUsd))
    ) {
      diff.currenciesChanged.push({ code: currency.code, db: row, source: currency });
    }
  }

  return diff;
}

async function applyDiff(sql, source, diff) {
  await sql.begin(async (tx) => {
    for (const city of [...diff.citiesMissing, ...diff.citiesChanged.map((entry) => entry.source)]) {
      await tx`
        insert into calculator_cities (id, name, published, position, updated_at)
        values (${city.id}, ${city.name}, ${city.published}, ${city.position}, now())
        on conflict (id) do update
          set name = excluded.name,
              published = excluded.published,
              position = excluded.position,
              updated_at = now()
      `;
    }

    for (const hotel of [...diff.hotelsMissing, ...diff.hotelsChanged.map((entry) => entry.source)]) {
      await tx`
        insert into calculator_hotels (id, city_id, name, total_rooms, published, position, updated_at)
        values (${hotel.id}, ${hotel.cityId}, ${hotel.name}, ${hotel.totalRooms}, 1, 9999, now())
        on conflict (id) do update
          set city_id = excluded.city_id,
              name = excluded.name,
              total_rooms = excluded.total_rooms,
              published = 1,
              updated_at = now()
      `;
    }

    for (const city of diff.citiesExtraPublished) {
      await tx`update calculator_cities set published = 0, updated_at = now() where id = ${city.id}`;
    }

    for (const hotel of diff.hotelsExtraPublished) {
      await tx`update calculator_hotels set published = 0, updated_at = now() where id = ${hotel.id}`;
    }

    for (const price of [...diff.pricesMissing, ...diff.pricesChanged.map((entry) => entry.source)]) {
      await tx`
        insert into calculator_prices (hotel_id, month, room_price, lunch_price, hitea_price, dinner_price, updated_at)
        values (${price.hotelId}, ${price.month}, ${price.roomPrice}, ${price.lunchPrice}, ${price.hiteaPrice}, ${price.dinnerPrice}, now())
        on conflict (hotel_id, month) do update
          set room_price = excluded.room_price,
              lunch_price = excluded.lunch_price,
              hitea_price = excluded.hitea_price,
              dinner_price = excluded.dinner_price,
              updated_at = now()
      `;
    }

    for (const currency of [...diff.currenciesMissing, ...diff.currenciesChanged.map((entry) => entry.source)]) {
      const sourceIndex = source.currencies.findIndex((entry) => entry.code === currency.code);
      await tx`
        insert into calculator_currencies (code, name, symbol, rate_to_usd, is_default, position, updated_at)
        values (${currency.code}, ${currency.name}, ${currency.symbol}, ${currency.rateToUsd}, 0, ${sourceIndex}, now())
        on conflict (code) do update
          set name = excluded.name,
              symbol = excluded.symbol,
              rate_to_usd = excluded.rate_to_usd,
              position = excluded.position,
              updated_at = now()
      `;
    }

    await tx`
      insert into content_version (id, version, updated_at)
      values (1, 1, now())
      on conflict (id) do update
        set version = content_version.version + 1, updated_at = now()
    `;
  });
}

function countDiff(diff) {
  return Object.fromEntries(Object.entries(diff).map(([key, value]) => [key, value.length]));
}

function sampleDiff(diff) {
  return Object.fromEntries(Object.entries(diff).map(([key, value]) => [key, value.slice(0, 8)]));
}

const source = await loadSource();
if (cacheOnly) process.exit(0);

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL or POSTGRES_URL.");

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
try {
  const db = await loadDb(sql);
  const scoped = filterSourceForScope(source, db);
  const diff = compare(scoped.source, db);
  console.log(JSON.stringify({
    scope: scoped.scope,
    source: {
      cities: scoped.source.cities.length,
      hotels: scoped.source.hotels.length,
      prices: sourcePriceRows(scoped.source).length,
      currencies: scoped.source.currencies.length,
      fetchedAt: source.fetchedAt,
    },
    database: db.counts,
    diff: countDiff(diff),
    examples: sampleDiff(diff),
  }, null, 2));

  if (apply) {
    await applyDiff(sql, scoped.source, diff);
    console.log("[vivahnam] applied calculator data differences and bumped content_version");
  }
} finally {
  await sql.end({ timeout: 5 });
}
