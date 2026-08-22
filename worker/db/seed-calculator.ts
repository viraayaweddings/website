/**
 * Imports the bundled calculator dataset into the database.
 *
 * Only runs against empty tables. Once a row exists the admin panel owns the
 * data, and re-importing would overwrite whatever was edited.
 */
import { calculatorData } from "../calculator-data.ts";
import type { Db } from "./client.ts";
import {
  CALCULATOR_MONTHS,
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
  type CalculatorMonth,
} from "./schema.ts";

/**
 * The bundle is a const-asserted literal, so every field has its own literal
 * type. It is read once here through a plain shape rather than cast at each
 * use.
 */
interface BundledCalculatorData {
  cities: Array<{ id: number; name: string }>;
  hotels: Array<{ id: number; name: string; total_rooms: number }>;
  hotelsByCity: Record<string, Array<{ id: number; name: string; total_rooms: number }>>;
  prices: Record<string, Record<string, Record<string, string>>>;
  currencies: Array<{ name: string; code: string; symbol: string; rate_to_usd: number }>;
}

export interface CalculatorSeedResult {
  cities: number;
  hotels: number;
  prices: number;
  currencies: number;
  skipped: boolean;
}

/** Postgres caps a statement's bind parameters, so rows go in batches. */
const BATCH = 400;

async function insertInBatches<T>(rows: T[], write: (chunk: T[]) => Promise<unknown>): Promise<number> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await write(rows.slice(i, i + BATCH));
  }
  return rows.length;
}

export async function seedCalculatorData(db: Db): Promise<CalculatorSeedResult> {
  const existing = await db.select({ id: calculatorHotels.id }).from(calculatorHotels).limit(1);
  if (existing.length > 0) {
    return { cities: 0, hotels: 0, prices: 0, currencies: 0, skipped: true };
  }

  const data = calculatorData as unknown as BundledCalculatorData;

  const cityRows = data.cities.map((city, index) => ({
    id: Number(city.id),
    name: String(city.name),
    published: 1,
    position: index,
  }));

  // hotelsByCity is what carries the city each hotel belongs to; the flat
  // `hotels` list does not, and it is also shorter than the priced set.
  const cityOfHotel = new Map<number, number>();
  for (const [cityId, hotels] of Object.entries(data.hotelsByCity ?? {})) {
    for (const hotel of hotels) {
      cityOfHotel.set(Number(hotel.id), Number(cityId));
    }
  }

  const seenHotel = new Set<number>();
  const hotelRows: Array<{ id: number; cityId: number; name: string; totalRooms: number; published: number; position: number }> = [];
  for (const [index, hotel] of data.hotels.entries()) {
    const id = Number(hotel.id);
    if (seenHotel.has(id)) continue;
    seenHotel.add(id);
    hotelRows.push({
      id,
      cityId: cityOfHotel.get(id) ?? 0,
      name: String(hotel.name),
      totalRooms: Number(hotel.total_rooms) || 0,
      published: 1,
      position: index,
    });
  }

  // Hotels that have prices but never appeared in the hotel list would
  // otherwise be dropped, taking their prices with them.
  for (const hotelId of Object.keys(data.prices ?? {})) {
    const id = Number(hotelId);
    if (seenHotel.has(id)) continue;
    seenHotel.add(id);
    const fromCity = cityOfHotel.get(id);
    hotelRows.push({
      id,
      cityId: fromCity ?? 0,
      name: `Hotel ${id}`,
      totalRooms: 0,
      // Unnamed and unplaced, so kept out of the picker until an admin fixes it.
      published: 0,
      position: 9999,
    });
  }

  const months = new Set<string>(CALCULATOR_MONTHS);
  const priceRows: Array<{
    hotelId: number; month: CalculatorMonth;
    roomPrice: string; lunchPrice: string; hiteaPrice: string; dinnerPrice: string;
  }> = [];
  for (const [hotelId, byMonth] of Object.entries(data.prices ?? {})) {
    for (const [month, cell] of Object.entries(byMonth)) {
      if (!months.has(month)) continue;
      priceRows.push({
        hotelId: Number(hotelId),
        month: month as CalculatorMonth,
        roomPrice: String(cell.room_price ?? "0.00"),
        lunchPrice: String(cell.lunch_price ?? "0.00"),
        hiteaPrice: String(cell.hitea_price ?? "0.00"),
        dinnerPrice: String(cell.dinner_price ?? "0.00"),
      });
    }
  }

  const currencyRows = data.currencies.map((currency, index) => ({
    code: String(currency.code),
    name: String(currency.name),
    symbol: String(currency.symbol ?? ""),
    rateToUsd: String(currency.rate_to_usd ?? 1),
    // The bundle ships INR with is_default false, which would leave the picker
    // with nothing selected.
    isDefault: index === 0 ? 1 : 0,
    position: index,
  }));

  await insertInBatches(cityRows, (chunk) => db.insert(calculatorCities).values(chunk).onConflictDoNothing());
  await insertInBatches(hotelRows, (chunk) => db.insert(calculatorHotels).values(chunk).onConflictDoNothing());
  await insertInBatches(priceRows, (chunk) => db.insert(calculatorPrices).values(chunk).onConflictDoNothing());
  await insertInBatches(currencyRows, (chunk) => db.insert(calculatorCurrencies).values(chunk).onConflictDoNothing());

  return {
    cities: cityRows.length,
    hotels: hotelRows.length,
    prices: priceRows.length,
    currencies: currencyRows.length,
    skipped: false,
  };
}
