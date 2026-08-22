/**
 * The calculator dataset, read from the database.
 *
 * This replaces the bundled table as the source the public calculator prices
 * from. The bundle is still imported, but only to seed an empty database --
 * once a row exists, the admin panel owns it.
 *
 * Everything is cached per instance for a short window: the calculator is on
 * ~270 pages and asks for cities, hotels and the whole price table on load, so
 * uncached this would be three round trips per visitor.
 */
import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
  type CalculatorMonth,
} from "../db/schema";

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

export interface CalculatorDataset {
  cities: CityRow[];
  hotels: HotelRow[];
  hotelsByCity: Record<string, HotelRow[]>;
  prices: Record<string, Record<string, PriceCell>>;
  currencies: CurrencyRow[];
}

const CACHE_TTL_MS = 30_000;
let cache: { at: number; data: CalculatorDataset } | null = null;

/** Dropped after a write so an edit is visible on the next request. */
export function invalidateCalculatorCache(): void {
  cache = null;
}

const EMPTY: CalculatorDataset = {
  cities: [],
  hotels: [],
  hotelsByCity: {},
  prices: {},
  currencies: [],
};

export async function loadCalculatorDataset(): Promise<CalculatorDataset> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const db = await getDb();
    if (!db) return cache?.data ?? EMPTY;

    const [cityRows, hotelRows, priceRows, currencyRows] = await Promise.all([
      db.select().from(calculatorCities).orderBy(asc(calculatorCities.position), asc(calculatorCities.name)),
      db.select().from(calculatorHotels).orderBy(asc(calculatorHotels.position), asc(calculatorHotels.name)),
      db.select().from(calculatorPrices),
      db.select().from(calculatorCurrencies).orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code)),
    ]);

    const cities = cityRows
      .filter((row) => row.published === 1)
      .map((row) => ({ id: row.id, name: row.name }));

    const published = hotelRows.filter((row) => row.published === 1);
    const hotels = published.map((row) => ({ id: row.id, name: row.name, total_rooms: row.totalRooms }));

    const hotelsByCity: Record<string, HotelRow[]> = {};
    for (const row of published) {
      const key = String(row.cityId);
      (hotelsByCity[key] ||= []).push({ id: row.id, name: row.name, total_rooms: row.totalRooms });
    }

    const prices: Record<string, Record<string, PriceCell>> = {};
    for (const row of priceRows) {
      (prices[String(row.hotelId)] ||= {})[row.month] = {
        room_price: row.roomPrice,
        lunch_price: row.lunchPrice,
        hitea_price: row.hiteaPrice,
        dinner_price: row.dinnerPrice,
      };
    }

    const currencies = currencyRows.map((row) => ({
      name: row.name,
      code: row.code,
      symbol: row.symbol,
      rate_to_usd: Number(row.rateToUsd) || 1,
      is_default: row.isDefault === 1,
    }));

    const data: CalculatorDataset = { cities, hotels, hotelsByCity, prices, currencies };
    cache = { at: now, data };
    return data;
  } catch (error) {
    console.error("[calculator] load failed", error instanceof Error ? error.message : error);
    // Keep serving the last good copy rather than pricing a page at zero.
    return cache?.data ?? EMPTY;
  }
}

/** One hotel's prices for one month, or null when it is not priced. */
export async function loadHotelPrice(hotelId: string, month: string): Promise<PriceCell | null> {
  const data = await loadCalculatorDataset();
  return data.prices[String(hotelId)]?.[month] ?? null;
}

export async function loadHotelsForCity(cityId: string): Promise<HotelRow[]> {
  const data = await loadCalculatorDataset();
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
