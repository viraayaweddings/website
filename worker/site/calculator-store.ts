/**
 * The calculator dataset, read from the database.
 *
 * This is the only source the public calculators price from. The bundled table
 * in worker/calculator-data.ts is a seed, not a fallback: it is read once by
 * seedCalculatorData() into empty tables and never again. A database that is
 * empty therefore prices nothing, and the "Price on request" overlay in
 * currency-switcher.js is what the visitor sees -- deliberately, because the
 * alternative is a quote built from prices frozen at the clone with nothing on
 * screen to say so.
 *
 * Two loaders, because they cost very different amounts. `loadCalculatorConfig`
 * is everything except the ~3,100-row price table, and is what the request-time
 * HTML injection needs; `loadCalculatorDataset` adds the prices and is what the
 * JSON endpoints serve. Both are cached per instance for a short window and
 * both drop that cache when any instance writes.
 */
import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
  calculatorTaxes,
  type CalculatorMonth,
} from "../db/schema";
import { onContentChanged } from "./content-version";

export interface CityRow {
  id: number;
  name: string;
}

export interface HotelRow {
  id: number;
  name: string;
  total_rooms: number;
}

export interface PriceCell {
  room_price: string;
  lunch_price: string;
  hitea_price: string;
  dinner_price: string;
}

export interface CurrencyRow {
  name: string;
  code: string;
  symbol: string;
  rate_to_usd: number;
  is_default: boolean;
}

export interface TaxRow {
  code: string;
  label: string;
  /** Percent of the subtotal, e.g. 9 for "CGST (9%)". */
  percent: number;
}

/** Everything the pages need except the price table. */
export interface CalculatorConfig {
  cities: CityRow[];
  hotels: HotelRow[];
  hotelsByCity: Record<string, HotelRow[]>;
  currencies: CurrencyRow[];
  taxes: TaxRow[];
  /**
   * Room capacity for every hotel row, published or not.
   *
   * The venue calculator caps its rooms input from this. It is keyed off the
   * page's own hotel id rather than off the picker, so an unpublished hotel --
   * one deliberately hidden from the city dropdown -- must still find its cap.
   */
  roomsByHotel: Record<string, number>;
  /**
   * City id for every hotel row, published or not.
   *
   * The venue listing groups by the same city ids the pickers use, and reaches
   * them through a venue's `external_hotel_id`.
   */
  cityByHotel: Record<string, number>;
  /** False when the database could not be read, so callers can avoid rewriting a page with nothing. */
  loaded: boolean;
}

export interface CalculatorDataset extends CalculatorConfig {
  prices: Record<string, Record<string, PriceCell>>;
}

/**
 * `cache-control` for every calculator JSON endpoint.
 *
 * Short enough that a price edit is live within the time it takes an admin to
 * switch tabs, long enough that the endpoints are still cacheable under load.
 * This, not the 30s instance cache, is what bounds how stale a visitor's copy
 * can be.
 */
export const CALCULATOR_CACHE_CONTROL = "public, max-age=15, stale-while-revalidate=60";

const CACHE_TTL_MS = 30_000;
let configCache: { at: number; data: CalculatorConfig } | null = null;
let datasetCache: { at: number; data: CalculatorDataset } | null = null;

/** Dropped after a write so an edit is visible on the next request. */
export function invalidateCalculatorCache(): void {
  configCache = null;
  datasetCache = null;
}

// Every other content module registers here; without it a price edit was
// visible only on the instance that handled the save until its own TTL lapsed.
onContentChanged(() => {
  invalidateCalculatorCache();
});

const EMPTY_CONFIG: CalculatorConfig = {
  cities: [],
  hotels: [],
  hotelsByCity: {},
  currencies: [],
  taxes: [],
  roomsByHotel: {},
  cityByHotel: {},
  loaded: false,
};

const EMPTY_DATASET: CalculatorDataset = { ...EMPTY_CONFIG, prices: {} };

export async function loadCalculatorConfig(): Promise<CalculatorConfig> {
  const now = Date.now();
  if (configCache && now - configCache.at < CACHE_TTL_MS) return configCache.data;
  // The full dataset is a superset and is cached separately; if it is warm
  // there is nothing to ask the database for.
  if (datasetCache && now - datasetCache.at < CACHE_TTL_MS) return datasetCache.data;

  try {
    const db = await getDb();
    if (!db) return configCache?.data ?? EMPTY_CONFIG;

    const [cityRows, hotelRows, currencyRows, taxRows] = await Promise.all([
      db.select().from(calculatorCities).orderBy(asc(calculatorCities.position), asc(calculatorCities.name)),
      db.select().from(calculatorHotels).orderBy(asc(calculatorHotels.position), asc(calculatorHotels.name)),
      db.select().from(calculatorCurrencies).orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code)),
      db.select().from(calculatorTaxes).orderBy(asc(calculatorTaxes.position), asc(calculatorTaxes.code)),
    ]);

    const data = buildConfig(cityRows, hotelRows, currencyRows, taxRows);
    configCache = { at: now, data };
    return data;
  } catch (error) {
    console.error("[calculator] config load failed", error instanceof Error ? error.message : error);
    // Keep serving the last good copy rather than blanking a picker.
    return configCache?.data ?? datasetCache?.data ?? EMPTY_CONFIG;
  }
}

export async function loadCalculatorDataset(): Promise<CalculatorDataset> {
  const now = Date.now();
  if (datasetCache && now - datasetCache.at < CACHE_TTL_MS) return datasetCache.data;

  try {
    const db = await getDb();
    if (!db) return datasetCache?.data ?? EMPTY_DATASET;

    const [cityRows, hotelRows, priceRows, currencyRows, taxRows] = await Promise.all([
      db.select().from(calculatorCities).orderBy(asc(calculatorCities.position), asc(calculatorCities.name)),
      db.select().from(calculatorHotels).orderBy(asc(calculatorHotels.position), asc(calculatorHotels.name)),
      db.select().from(calculatorPrices),
      db.select().from(calculatorCurrencies).orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code)),
      db.select().from(calculatorTaxes).orderBy(asc(calculatorTaxes.position), asc(calculatorTaxes.code)),
    ]);

    const prices: Record<string, Record<string, PriceCell>> = {};
    for (const row of priceRows) {
      (prices[String(row.hotelId)] ||= {})[row.month] = {
        room_price: row.roomPrice,
        lunch_price: row.lunchPrice,
        hitea_price: row.hiteaPrice,
        dinner_price: row.dinnerPrice,
      };
    }

    const data: CalculatorDataset = {
      ...buildConfig(cityRows, hotelRows, currencyRows, taxRows),
      prices,
    };
    datasetCache = { at: now, data };
    configCache = { at: now, data };
    return data;
  } catch (error) {
    console.error("[calculator] load failed", error instanceof Error ? error.message : error);
    // Keep serving the last good copy rather than pricing a page at zero.
    return datasetCache?.data ?? EMPTY_DATASET;
  }
}

type CityRecord = typeof calculatorCities.$inferSelect;
type HotelRecord = typeof calculatorHotels.$inferSelect;
type CurrencyRecord = typeof calculatorCurrencies.$inferSelect;
type TaxRecord = typeof calculatorTaxes.$inferSelect;

function buildConfig(
  cityRows: CityRecord[],
  hotelRows: HotelRecord[],
  currencyRows: CurrencyRecord[],
  taxRows: TaxRecord[],
): CalculatorConfig {
  const cities = cityRows
    .filter((row) => row.published === 1)
    .map((row) => ({ id: row.id, name: row.name }));

  const published = hotelRows.filter((row) => row.published === 1);
  const hotels = published.map((row) => ({ id: row.id, name: row.name, total_rooms: row.totalRooms }));

  const roomsByHotel: Record<string, number> = {};
  const cityByHotel: Record<string, number> = {};
  for (const row of hotelRows) {
    roomsByHotel[String(row.id)] = row.totalRooms;
    cityByHotel[String(row.id)] = row.cityId;
  }

  const hotelsByCity: Record<string, HotelRow[]> = {};
  for (const row of published) {
    const key = String(row.cityId);
    (hotelsByCity[key] ||= []).push({ id: row.id, name: row.name, total_rooms: row.totalRooms });
  }

  const currencies = currencyRows.map((row) => ({
    name: row.name,
    code: row.code,
    symbol: row.symbol,
    rate_to_usd: Number(row.rateToUsd) || 1,
    is_default: row.isDefault === 1,
  }));

  const taxes = taxRows
    .filter((row) => row.published === 1)
    .map((row) => ({ code: row.code, label: row.label, percent: Number(row.percent) || 0 }));

  return { cities, hotels, hotelsByCity, currencies, taxes, roomsByHotel, cityByHotel, loaded: true };
}

/**
 * Room capacity for one calculator hotel, or null when the id is not one.
 *
 * The venue pages used to take this from `hotels.total_rooms`, a second field
 * holding the same number that nothing kept in step with this one.
 */
export async function loadHotelRoomCap(hotelId: string): Promise<number | null> {
  const id = String(hotelId).trim();
  if (!id) return null;
  const { roomsByHotel } = await loadCalculatorConfig();
  return Object.prototype.hasOwnProperty.call(roomsByHotel, id) ? roomsByHotel[id] : null;
}

/** One hotel's prices for one month, or null when it is not priced. */
export async function loadHotelPrice(hotelId: string, month: string): Promise<PriceCell | null> {
  const data = await loadCalculatorDataset();
  return data.prices[String(hotelId)]?.[month] ?? null;
}

export async function loadHotelsForCity(cityId: string): Promise<HotelRow[]> {
  const data = await loadCalculatorConfig();
  return data.hotelsByCity[String(cityId)] ?? [];
}

/** True once the dataset has been imported, used to gate the seed. */
export async function calculatorHasData(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: calculatorHotels.id }).from(calculatorHotels).limit(1);
  return rows.length > 0;
}

export async function findHotel(hotelId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(calculatorHotels).where(eq(calculatorHotels.id, hotelId)).limit(1);
  return rows[0] ?? null;
}

export type { CalculatorMonth };
