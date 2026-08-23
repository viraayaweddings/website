"use server";

import { redirect } from "next/navigation";
import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  CALCULATOR_MONTHS,
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
  calculatorTaxes,
  type CalculatorMonth,
} from "@/worker/db/schema";
import { invalidateCalculatorCache } from "@/worker/site/calculator-store";
import { seedCalculatorData } from "@/worker/db/seed-calculator";
import { assertSameOrigin, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

const CALCULATOR_PATH = "/admin/calculator";
const HOTELS_PATH = "/admin/calculator/hotels";

function failed(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`));
}

function done(target: string, message: string): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`));
}

/** The hotel list view to return to, so filters and page survive an action. */
function backToHotels(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith(HOTELS_PATH) && !raw.startsWith("//") ? raw : HOTELS_PATH;
}

function text(formData: FormData, name: string, max = 200): string {
  return String(formData.get(name) || "").trim().slice(0, max);
}

function id(formData: FormData, name: string): number | null {
  const value = Number.parseInt(String(formData.get(name) || ""), 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** No hotel costs this much a night; a figure above it is a typo, not a price. */
const MAX_PRICE = 100_000_000;

/**
 * One price cell.
 *
 * Accepts a typed "1,20,000.50" as readily as "120000.5", and an empty cell as
 * zero. Anything else is refused rather than quietly stored as zero, which is
 * what used to happen and is indistinguishable on screen from a free hotel.
 */
function money(formData: FormData, name: string, month: string, field: string, target: string): string {
  const raw = String(formData.get(name) || "").trim();
  if (!raw) return "0.00";

  const cleaned = raw.replace(/[\s,\u20b9]/g, "");
  if (!/^\d*(?:\.\d{1,2})?$/.test(cleaned) || cleaned === "." || cleaned === "") {
    failed(target, `The ${field} price for ${month} is not a number. Use figures like 145000 or 145000.50.`);
  }

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    failed(target, `The ${field} price for ${month} cannot be negative.`);
  }
  if (value > MAX_PRICE) {
    failed(target, `The ${field} price for ${month} looks like a typo; keep it under ${MAX_PRICE.toLocaleString("en-IN")}.`);
  }

  return value.toFixed(2);
}

/* -------------------------------------------------------------- cities --- */

export async function saveCalculatorCityAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const name = text(formData, "name", 120);
  if (!name) failed(CALCULATOR_PATH, "Enter the city name.");

  const existing = id(formData, "id");
  const published = formData.get("published") === "on" ? 1 : 0;

  const rawPosition = String(formData.get("position") || "").trim();
  if (rawPosition && !/^-?\d+$/.test(rawPosition)) failed(CALCULATOR_PATH, "The order is a whole number.");
  const position = rawPosition ? Number.parseInt(rawPosition, 10) : 0;
  if (!Number.isFinite(position) || position < -9999 || position > 9999) {
    failed(CALCULATOR_PATH, "The order must be between -9999 and 9999.");
  }

  // Two cities with the same name make the picker unusable: the visitor cannot
  // tell which one they are choosing.
  const sameName = await db
    .select({ id: calculatorCities.id })
    .from(calculatorCities)
    .where(sql`lower(${calculatorCities.name}) = ${name.toLowerCase()}`);
  if (sameName.some((row) => row.id !== existing)) {
    failed(CALCULATOR_PATH, `The calculator already has a city called "${name}".`);
  }

  if (existing) {
    const updated = await db
      .update(calculatorCities)
      .set({ name, published, position, updatedAt: new Date() })
      .where(eq(calculatorCities.id, existing))
      .returning({ id: calculatorCities.id });
    if (!updated.length) failed(CALCULATOR_PATH, "That city no longer exists.");
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

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  done(CALCULATOR_PATH, "City saved.");
}

export async function deleteCalculatorCityAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
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

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  done(CALCULATOR_PATH, "City deleted.");
}

export async function bulkDeleteCalculatorCitiesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
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

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  done(CALCULATOR_PATH, `${cityIds.length} cit${cityIds.length === 1 ? "y" : "ies"} deleted.`);
}

/* -------------------------------------------------------------- hotels --- */

export async function saveCalculatorHotelAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const name = text(formData, "name", 200);
  const cityId = id(formData, "cityId");
  const existing = id(formData, "id");
  const target = existing ? `${HOTELS_PATH}/${existing}` : HOTELS_PATH;

  if (!name) failed(target, "Enter the hotel name.");
  if (!cityId) failed(target, "Choose a city.");

  // A hotel in a city that does not exist never appears in the picker, which
  // reads as the save having silently failed.
  const city = await db
    .select({ id: calculatorCities.id })
    .from(calculatorCities)
    .where(eq(calculatorCities.id, cityId))
    .limit(1);
  if (!city.length) failed(target, "That city is no longer in the calculator. Choose another.");

  const rawRooms = String(formData.get("totalRooms") || "").trim();
  if (rawRooms && !/^\d+$/.test(rawRooms)) failed(target, "Total rooms is a whole number of zero or more.");
  const totalRooms = rawRooms ? Number.parseInt(rawRooms, 10) : 0;
  if (totalRooms > 100_000) failed(target, "Total rooms looks like a typo; keep it under 100,000.");

  const published = formData.get("published") === "on" ? 1 : 0;

  if (existing) {
    const updated = await db
      .update(calculatorHotels)
      .set({ name, cityId, totalRooms, published, updatedAt: new Date() })
      .where(eq(calculatorHotels.id, existing))
      .returning({ id: calculatorHotels.id });
    if (!updated.length) failed(HOTELS_PATH, "That hotel no longer exists.");
    await recordAudit(db, actor, "calculator.hotel_updated", "calculator_hotel", existing, { name, cityId });
    invalidateCalculatorCache();
    // Tells the other instances their caches are stale; the local calls above
    // only reach this one.
    await publishContentChange();
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
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(`${HOTELS_PATH}/${nextId}`, "Hotel added. Set its prices below.");
}

export async function deleteCalculatorHotelAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const target = backToHotels(formData);
  const hotelId = id(formData, "id");
  if (!hotelId) failed(target, "That hotel could not be identified.");

  const hotel = (
    await db.select().from(calculatorHotels).where(eq(calculatorHotels.id, hotelId)).limit(1)
  )[0];
  if (!hotel) failed(target, "That hotel no longer exists.");

  await db.transaction(async (tx) => {
    await tx.delete(calculatorPrices).where(eq(calculatorPrices.hotelId, hotelId));
    await tx.delete(calculatorHotels).where(eq(calculatorHotels.id, hotelId));
  });

  await recordAudit(db, actor, "calculator.hotel_deleted", "calculator_hotel", hotelId, { name: hotel.name });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(target, `${hotel.name} and its prices deleted.`);
}

export async function bulkDeleteCalculatorHotelsAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backToHotels(formData);
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  const hotelIds = [...new Set(ids)];

  if (!hotelIds.length) failed(target, "Select at least one hotel first.");
  if (hotelIds.length > 200) failed(target, "Delete 200 hotels or fewer at a time.");

  await db.transaction(async (tx) => {
    await tx.delete(calculatorPrices).where(inArray(calculatorPrices.hotelId, hotelIds));
    await tx.delete(calculatorHotels).where(inArray(calculatorHotels.id, hotelIds));
  });

  await recordAudit(db, actor, "calculator.hotel_bulk_deleted", "calculator_hotel", hotelIds.join(","), {
    count: hotelIds.length,
  });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(target, `${hotelIds.length} hotel${hotelIds.length === 1 ? "" : "s"} and their prices deleted.`);
}

/** Saves all twelve months for one hotel in a single statement. */
export async function saveCalculatorPricesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const hotelId = id(formData, "hotelId");
  if (!hotelId) failed(HOTELS_PATH, "That hotel could not be identified.");
  const target = `${HOTELS_PATH}/${hotelId}`;

  const hotel = await db
    .select({ id: calculatorHotels.id })
    .from(calculatorHotels)
    .where(eq(calculatorHotels.id, hotelId))
    .limit(1);
  if (!hotel.length) failed(HOTELS_PATH, "That hotel no longer exists.");

  // Every cell is parsed before anything is written, so a single bad figure
  // does not leave eleven months saved and one rejected.
  const rows = CALCULATOR_MONTHS.map((month) => ({
    hotelId,
    month: month as CalculatorMonth,
    roomPrice: money(formData, `room_${month}`, month, "room", target),
    lunchPrice: money(formData, `lunch_${month}`, month, "lunch", target),
    hiteaPrice: money(formData, `hitea_${month}`, month, "hi-tea", target),
    dinnerPrice: money(formData, `dinner_${month}`, month, "dinner", target),
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
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(target, "Prices saved.");
}

/* --------------------------------------------------------------- taxes --- */

/**
 * Save (or add) one tax line.
 *
 * Every calculator renders one summary row per published tax, in `position`
 * order, and totals with the sum of their percentages. Nothing here is
 * hardcoded on the pages any more, so this is the only place an Indian GST
 * change, a new state levy or a service charge needs to be entered.
 */
export async function saveCalculatorTaxAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const code = text(formData, "code", 24).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const label = text(formData, "label", 60);
  if (!code) failed(CALCULATOR_PATH, "Give the tax a short code, e.g. cgst.");
  if (!label) failed(CALCULATOR_PATH, "Enter the label shown on the cost summary, e.g. CGST.");

  const rawPercent = String(formData.get("percent") || "").trim();
  if (!/^\d*\.?\d+$/.test(rawPercent)) failed(CALCULATOR_PATH, "The rate is a number of percent, e.g. 9 or 2.5.");
  const percent = Number.parseFloat(rawPercent);
  if (!Number.isFinite(percent) || percent < 0) failed(CALCULATOR_PATH, "Enter the rate as a percentage.");
  // A rate above this is a typo, and a typo here multiplies every quote on the
  // site. There is no second place the number is checked.
  if (percent > 100) failed(CALCULATOR_PATH, "That rate is over 100%; check the number.");

  const published = formData.get("published") === "on" ? 1 : 0;
  const rawPosition = String(formData.get("position") || "").trim();
  const position = rawPosition ? Number.parseInt(rawPosition, 10) || 0 : 0;

  await db
    .insert(calculatorTaxes)
    .values({ code, label, percent: percent.toFixed(2), published, position })
    .onConflictDoUpdate({
      target: calculatorTaxes.code,
      set: { label, percent: percent.toFixed(2), published, position, updatedAt: new Date() },
    });

  await recordAudit(db, actor, "calculator.tax_saved", "calculator_tax", code, { label, percent });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(CALCULATOR_PATH, `${label} saved.`);
}

export async function deleteCalculatorTaxAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const code = text(formData, "code", 24).toLowerCase();
  if (!code) failed(CALCULATOR_PATH, "That tax no longer exists.");

  const gone = await db
    .delete(calculatorTaxes)
    .where(eq(calculatorTaxes.code, code))
    .returning({ code: calculatorTaxes.code });
  if (!gone.length) failed(CALCULATOR_PATH, "That tax no longer exists.");

  await recordAudit(db, actor, "calculator.tax_deleted", "calculator_tax", code, {});
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(CALCULATOR_PATH, "Tax removed. Every calculator now totals without it.");
}

export async function bulkDeleteCalculatorTaxesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const codes = [
    ...new Set(formData.getAll("ids").map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)),
  ].slice(0, 200);

  if (!codes.length) failed(CALCULATOR_PATH, "Select at least one tax first.");

  await db.delete(calculatorTaxes).where(inArray(calculatorTaxes.code, codes));

  await recordAudit(db, actor, "calculator.tax_bulk_deleted", "calculator_tax", codes.join(","), {
    count: codes.length,
  });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(CALCULATOR_PATH, `${codes.length} tax line${codes.length === 1 ? "" : "s"} deleted.`);
}

/* ---------------------------------------------------------- currencies --- */

export async function saveCurrencyAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const code = text(formData, "code", 8).toUpperCase();
  const name = text(formData, "currencyName", 80);
  if (!/^[A-Z]{3,8}$/.test(code)) failed(CALCULATOR_PATH, "Use a currency code like INR or USD.");
  if (!name) failed(CALCULATOR_PATH, "Enter the currency name.");

  const rawRate = String(formData.get("rateToUsd") || "").trim();
  if (!/^\d*\.?\d+$/.test(rawRate)) {
    failed(CALCULATOR_PATH, "The rate is a number, e.g. 94.15 for the rupee.");
  }
  const rate = Number.parseFloat(rawRate);
  if (!Number.isFinite(rate) || rate <= 0) failed(CALCULATOR_PATH, "Enter how many of this currency one USD buys.");
  if (rate > 1_000_000) failed(CALCULATOR_PATH, "That rate looks like a typo; keep it under 1,000,000.");

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
  } else {
    // Unticking the box on the only default would leave the set without one.
    await ensureOneDefaultCurrency(db);
  }

  await recordAudit(db, actor, "calculator.currency_saved", "calculator_currency", code, { name });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(CALCULATOR_PATH, "Currency saved.");
}

export async function deleteCurrencyAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const code = text(formData, "code", 8).toUpperCase();
  if (!code) failed(CALCULATOR_PATH, "That currency no longer exists.");

  const all = await db.select().from(calculatorCurrencies);
  if (all.length <= 1) failed(CALCULATOR_PATH, "Keep at least one currency.");

  const gone = await db
    .delete(calculatorCurrencies)
    .where(eq(calculatorCurrencies.code, code))
    .returning({ code: calculatorCurrencies.code });
  if (!gone.length) failed(CALCULATOR_PATH, "That currency no longer exists.");

  await ensureOneDefaultCurrency(db);
  await recordAudit(db, actor, "calculator.currency_deleted", "calculator_currency", code, {});
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(CALCULATOR_PATH, "Currency deleted.");
}

export async function bulkDeleteCurrenciesAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const codes = [...new Set(formData.getAll("ids").map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))]
    .slice(0, 200);

  if (!codes.length) failed(CALCULATOR_PATH, "Select at least one currency first.");

  const all = await db.select().from(calculatorCurrencies);
  if (all.length - codes.length < 1) failed(CALCULATOR_PATH, "Keep at least one currency.");

  await db.delete(calculatorCurrencies).where(inArray(calculatorCurrencies.code, codes));
  await ensureOneDefaultCurrency(db);

  await recordAudit(db, actor, "calculator.currency_bulk_deleted", "calculator_currency", codes.join(","), {
    count: codes.length,
  });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(CALCULATOR_PATH, `${codes.length} currenc${codes.length === 1 ? "y" : "ies"} deleted.`);
}

/**
 * Leaves exactly one currency marked as the default.
 *
 * The switcher opens on the default; with none marked it opens on nothing and
 * the calculator prices in whatever the page last held.
 */
async function ensureOneDefaultCurrency(db: Awaited<ReturnType<typeof requireDb>>): Promise<void> {
  const all = await db
    .select()
    .from(calculatorCurrencies)
    .orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code));
  if (!all.length) return;

  const defaults = all.filter((row) => row.isDefault === 1);
  if (defaults.length === 1) return;

  const keep = defaults[0] ?? all[0];
  await db
    .update(calculatorCurrencies)
    .set({ isDefault: 0 })
    .where(sql`${calculatorCurrencies.code} <> ${keep.code}`);
  await db
    .update(calculatorCurrencies)
    .set({ isDefault: 1 })
    .where(eq(calculatorCurrencies.code, keep.code));
}

/* ---------------------------------------------------------------- seed --- */

/** One-time import of the bundled dataset into empty tables. */
export async function importCalculatorDataAction(): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  const result = await seedCalculatorData(db);
  if (result.skipped) failed(CALCULATOR_PATH, "The calculator already has data; nothing was imported.");

  await recordAudit(db, actor, "calculator.imported", "calculator", "bundle", { ...result });
  invalidateCalculatorCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();
  done(
    CALCULATOR_PATH,
    `Imported ${result.cities} cities, ${result.hotels} hotels and ${result.prices} price rows.`,
  );
}
