"use server";

import { redirect } from "next/navigation";
import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  CALCULATOR_MONTHS,
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
  type CalculatorMonth,
} from "@/worker/db/schema";
import { invalidateCalculatorCache } from "@/worker/site/calculator-store";
import { seedCalculatorData } from "@/worker/db/seed-calculator";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const CALCULATOR_PATH = "/admin/calculator";
const HOTELS_PATH = "/admin/calculator/hotels";

function failed(target: string, message: string): never {
  redirect(`${target}?error=${encodeURIComponent(message)}`);
}

function done(target: string, message: string): never {
  redirect(`${target}?saved=${encodeURIComponent(message)}`);
}

function text(formData: FormData, name: string, max = 200): string {
  return String(formData.get(name) || "").trim().slice(0, max);
}

function id(formData: FormData, name: string): number | null {
  const value = Number.parseInt(String(formData.get(name) || ""), 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Accepts a typed "1,20,000.50" as readily as "120000.5". */
function money(formData: FormData, name: string): string {
  const raw = String(formData.get(name) || "").replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return "0.00";
  return value.toFixed(2);
}

/* -------------------------------------------------------------- cities --- */

export async function saveCalculatorCityAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const name = text(formData, "name", 120);
  if (!name) failed(CALCULATOR_PATH, "Enter the city name.");

  const existing = id(formData, "id");
  const published = formData.get("published") === "on" ? 1 : 0;
  const position = Number.parseInt(String(formData.get("position") || "0"), 10) || 0;

  if (existing) {
    await db
      .update(calculatorCities)
      .set({ name, published, position, updatedAt: new Date() })
      .where(eq(calculatorCities.id, existing));
    await recordAudit(db, actor, "calculator.city_updated", "calculator_city", existing, { name });
  } else {
    // Ids are the dataset's own. A new one continues the sequence rather than
    // reusing a number some venue page already hardcodes.
    const [max] = await db
      .select({ value: sql<number>`coalesce(max(${calculatorCities.id}), 0)` })
      .from(calculatorCities);
    const nextId = Number(max?.value ?? 0) + 1;
    await db.insert(calculatorCities).values({ id: nextId, name, published, position });
    await recordAudit(db, actor, "calculator.city_created", "calculator_city", nextId, { name });
  }

  invalidateCalculatorCache();
  done(CALCULATOR_PATH, "City saved.");
}

export async function deleteCalculatorCityAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const cityId = id(formData, "id");
  if (!cityId) failed(CALCULATOR_PATH, "That city no longer exists.");

  // Refused rather than cascaded: the hotels would keep their prices but lose
  // the city that puts them in the picker, and nothing would say why.
  const hotels = await db
    .select({ id: calculatorHotels.id })
    .from(calculatorHotels)
    .where(eq(calculatorHotels.cityId, cityId))
    .limit(1);
  if (hotels.length > 0) {
    failed(CALCULATOR_PATH, "Move or delete the hotels in this city first.");
  }

  await db.delete(calculatorCities).where(eq(calculatorCities.id, cityId));
  await recordAudit(db, actor, "calculator.city_deleted", "calculator_city", cityId, {});

  invalidateCalculatorCache();
  done(CALCULATOR_PATH, "City deleted.");
}

export async function bulkDeleteCalculatorCitiesAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  const cityIds = [...new Set(ids)].slice(0, 200);

  if (!cityIds.length) failed(CALCULATOR_PATH, "Select at least one city first.");

  const linkedHotels = await db
    .select({ id: calculatorHotels.id })
    .from(calculatorHotels)
    .where(inArray(calculatorHotels.cityId, cityIds))
    .limit(1);
  if (linkedHotels.length > 0) failed(CALCULATOR_PATH, "Move or delete the hotels in the selected cities first.");

  await db.delete(calculatorCities).where(inArray(calculatorCities.id, cityIds));
  await recordAudit(db, actor, "calculator.city_bulk_deleted", "calculator_city", cityIds.join(","), {
    count: cityIds.length,
  });

  invalidateCalculatorCache();
  done(CALCULATOR_PATH, `${cityIds.length} cit${cityIds.length === 1 ? "y" : "ies"} deleted.`);
}

/* -------------------------------------------------------------- hotels --- */

export async function saveCalculatorHotelAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const name = text(formData, "name", 200);
  const cityId = id(formData, "cityId");
  if (!name) failed(HOTELS_PATH, "Enter the hotel name.");
  if (!cityId) failed(HOTELS_PATH, "Choose a city.");

  const totalRooms = Math.max(0, Number.parseInt(String(formData.get("totalRooms") || "0"), 10) || 0);
  const published = formData.get("published") === "on" ? 1 : 0;
  const existing = id(formData, "id");

  if (existing) {
    await db
      .update(calculatorHotels)
      .set({ name, cityId, totalRooms, published, updatedAt: new Date() })
      .where(eq(calculatorHotels.id, existing));
    await recordAudit(db, actor, "calculator.hotel_updated", "calculator_hotel", existing, { name, cityId });
    invalidateCalculatorCache();
    done(`${HOTELS_PATH}/${existing}`, "Hotel saved.");
  }

  const [max] = await db
    .select({ value: sql<number>`coalesce(max(${calculatorHotels.id}), 0)` })
    .from(calculatorHotels);
  const nextId = Number(max?.value ?? 0) + 1;

  await db.insert(calculatorHotels).values({ id: nextId, cityId, name, totalRooms, published });
  // A hotel with no price rows prices at zero, so it starts with a full year.
  await db.insert(calculatorPrices).values(
    CALCULATOR_MONTHS.map((month) => ({ hotelId: nextId, month: month as CalculatorMonth })),
  );

  await recordAudit(db, actor, "calculator.hotel_created", "calculator_hotel", nextId, { name, cityId });
  invalidateCalculatorCache();
  done(`${HOTELS_PATH}/${nextId}`, "Hotel added. Set its prices below.");
}

export async function deleteCalculatorHotelAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const hotelId = id(formData, "id");
  if (!hotelId) failed(HOTELS_PATH, "That hotel no longer exists.");

  await db.transaction(async (tx) => {
    await tx.delete(calculatorPrices).where(eq(calculatorPrices.hotelId, hotelId));
    await tx.delete(calculatorHotels).where(eq(calculatorHotels.id, hotelId));
  });

  await recordAudit(db, actor, "calculator.hotel_deleted", "calculator_hotel", hotelId, {});
  invalidateCalculatorCache();
  done(HOTELS_PATH, "Hotel and its prices deleted.");
}

export async function bulkDeleteCalculatorHotelsAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  const hotelIds = [...new Set(ids)].slice(0, 200);

  if (!hotelIds.length) failed(HOTELS_PATH, "Select at least one hotel first.");

  await db.transaction(async (tx) => {
    await tx.delete(calculatorPrices).where(inArray(calculatorPrices.hotelId, hotelIds));
    await tx.delete(calculatorHotels).where(inArray(calculatorHotels.id, hotelIds));
  });

  await recordAudit(db, actor, "calculator.hotel_bulk_deleted", "calculator_hotel", hotelIds.join(","), {
    count: hotelIds.length,
  });
  invalidateCalculatorCache();
  done(HOTELS_PATH, `${hotelIds.length} hotel${hotelIds.length === 1 ? "" : "s"} and their prices deleted.`);
}

/** Saves all twelve months for one hotel in a single statement. */
export async function saveCalculatorPricesAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const hotelId = id(formData, "hotelId");
  if (!hotelId) failed(HOTELS_PATH, "That hotel no longer exists.");

  const rows = CALCULATOR_MONTHS.map((month) => ({
    hotelId,
    month: month as CalculatorMonth,
    roomPrice: money(formData, `room_${month}`),
    lunchPrice: money(formData, `lunch_${month}`),
    hiteaPrice: money(formData, `hitea_${month}`),
    dinnerPrice: money(formData, `dinner_${month}`),
    updatedAt: new Date(),
  }));

  await db
    .insert(calculatorPrices)
    .values(rows)
    .onConflictDoUpdate({
      target: [calculatorPrices.hotelId, calculatorPrices.month],
      set: {
        roomPrice: sql`excluded.room_price`,
        lunchPrice: sql`excluded.lunch_price`,
        hiteaPrice: sql`excluded.hitea_price`,
        dinnerPrice: sql`excluded.dinner_price`,
        updatedAt: sql`now()`,
      },
    });

  await recordAudit(db, actor, "calculator.prices_updated", "calculator_hotel", hotelId, { months: rows.length });
  invalidateCalculatorCache();
  done(`${HOTELS_PATH}/${hotelId}`, "Prices saved.");
}

/* ---------------------------------------------------------- currencies --- */

export async function saveCurrencyAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const code = text(formData, "code", 8).toUpperCase();
  const name = text(formData, "currencyName", 80);
  if (!/^[A-Z]{3,8}$/.test(code)) failed(CALCULATOR_PATH, "Use a currency code like INR or USD.");
  if (!name) failed(CALCULATOR_PATH, "Enter the currency name.");

  const rate = Number.parseFloat(String(formData.get("rateToUsd") || ""));
  if (!Number.isFinite(rate) || rate <= 0) failed(CALCULATOR_PATH, "Enter how many of this currency one USD buys.");

  const symbol = text(formData, "symbol", 8);
  const isDefault = formData.get("isDefault") === "on" ? 1 : 0;

  await db
    .insert(calculatorCurrencies)
    .values({ code, name, symbol, rateToUsd: String(rate), isDefault })
    .onConflictDoUpdate({
      target: calculatorCurrencies.code,
      set: { name, symbol, rateToUsd: String(rate), isDefault, updatedAt: new Date() },
    });

  // Exactly one default, or the picker opens with nothing selected.
  if (isDefault === 1) {
    await db
      .update(calculatorCurrencies)
      .set({ isDefault: 0 })
      .where(sql`${calculatorCurrencies.code} <> ${code}`);
  }

  await recordAudit(db, actor, "calculator.currency_saved", "calculator_currency", code, { name });
  invalidateCalculatorCache();
  done(CALCULATOR_PATH, "Currency saved.");
}

export async function deleteCurrencyAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const code = text(formData, "code", 8).toUpperCase();
  if (!code) failed(CALCULATOR_PATH, "That currency no longer exists.");

  const all = await db.select().from(calculatorCurrencies);
  if (all.length <= 1) failed(CALCULATOR_PATH, "Keep at least one currency.");

  await db.delete(calculatorCurrencies).where(eq(calculatorCurrencies.code, code));

  // Never leave the set without a default.
  const survivors = await db
    .select()
    .from(calculatorCurrencies)
    .orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code));
  if (survivors.length > 0 && !survivors.some((row) => row.isDefault === 1)) {
    await db
      .update(calculatorCurrencies)
      .set({ isDefault: 1 })
      .where(eq(calculatorCurrencies.code, survivors[0].code));
  }

  await recordAudit(db, actor, "calculator.currency_deleted", "calculator_currency", code, {});
  invalidateCalculatorCache();
  done(CALCULATOR_PATH, "Currency deleted.");
}

export async function bulkDeleteCurrenciesAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const codes = [...new Set(formData.getAll("ids").map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))]
    .slice(0, 200);

  if (!codes.length) failed(CALCULATOR_PATH, "Select at least one currency first.");

  const all = await db.select().from(calculatorCurrencies);
  if (all.length - codes.length < 1) failed(CALCULATOR_PATH, "Keep at least one currency.");

  await db.delete(calculatorCurrencies).where(inArray(calculatorCurrencies.code, codes));

  const survivors = await db
    .select()
    .from(calculatorCurrencies)
    .orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code));
  if (survivors.length > 0 && !survivors.some((row) => row.isDefault === 1)) {
    await db
      .update(calculatorCurrencies)
      .set({ isDefault: 1 })
      .where(eq(calculatorCurrencies.code, survivors[0].code));
  }

  await recordAudit(db, actor, "calculator.currency_bulk_deleted", "calculator_currency", codes.join(","), {
    count: codes.length,
  });
  invalidateCalculatorCache();
  done(CALCULATOR_PATH, `${codes.length} currenc${codes.length === 1 ? "y" : "ies"} deleted.`);
}

/* ---------------------------------------------------------------- seed --- */

/** One-time import of the bundled dataset into empty tables. */
export async function importCalculatorDataAction(): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const result = await seedCalculatorData(db);
  if (result.skipped) failed(CALCULATOR_PATH, "The calculator already has data; nothing was imported.");

  await recordAudit(db, actor, "calculator.imported", "calculator", "bundle", { ...result });
  invalidateCalculatorCache();
  done(
    CALCULATOR_PATH,
    `Imported ${result.cities} cities, ${result.hotels} hotels and ${result.prices} price rows.`,
  );
}
