/**
 * Optional calculator price overrides stored in D1 settings.
 *
 * Lets operations staff adjust pricing without redeploying the worker bundle.
 * Only `prices` keys are merged; cities and hotel lists stay in the bundle.
 */
import { eq } from "drizzle-orm";
import type { DatabaseEnv, Db } from "../db/client";
import { getDb } from "../db/client";
import { calculatorData } from "../calculator-data";
import { settings } from "../db/schema";

export const CALCULATOR_PRICES_KEY = "calculator_prices";

type PriceTable = typeof calculatorData.prices;

let cache: { at: number; prices: PriceTable } | null = null;
const CACHE_TTL_MS = 30_000;

function mergePrices(base: PriceTable, override: unknown): PriceTable {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  const merged: PriceTable = { ...base };
  for (const [hotelId, months] of Object.entries(override as Record<string, unknown>)) {
    if (!months || typeof months !== "object" || Array.isArray(months)) continue;
    merged[hotelId as keyof PriceTable] = {
      ...(merged[hotelId as keyof PriceTable] ?? {}),
      ...(months as Record<string, { room_price: string; lunch_price: string; hitea_price: string; dinner_price: string }>),
    };
  }
  return merged;
}

export async function loadCalculatorPrices(env: DatabaseEnv): Promise<PriceTable> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.prices;

  const base = calculatorData.prices;
  const db = await getDb(env);
  if (!db) {
    cache = { at: now, prices: base };
    return base;
  }

  const row = (await db.select().from(settings).where(eq(settings.key, CALCULATOR_PRICES_KEY)).limit(1))[0];
  if (!row) {
    cache = { at: now, prices: base };
    return base;
  }

  try {
    const parsed = JSON.parse(row.value);
    const prices = mergePrices(base, parsed);
    cache = { at: now, prices };
    return prices;
  } catch {
    cache = { at: now, prices: base };
    return base;
  }
}

export function invalidateCalculatorPriceCache(): void {
  cache = null;
}

export async function readCalculatorPriceOverrides(db: Db): Promise<string> {
  const row = (await db.select().from(settings).where(eq(settings.key, CALCULATOR_PRICES_KEY)).limit(1))[0];
  if (!row) return "";
  try {
    return JSON.stringify(JSON.parse(row.value), null, 2);
  } catch {
    return row.value;
  }
}

export async function writeCalculatorPriceOverrides(
  db: Db,
  updatedBy: string,
  raw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = raw.trim();
  if (!trimmed) {
    await db.delete(settings).where(eq(settings.key, CALCULATOR_PRICES_KEY));
    invalidateCalculatorPriceCache();
    return { ok: true };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Enter valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "The override must be a JSON object keyed by hotel id." };
  }

  const now = new Date();
  await db
    .insert(settings)
    .values({ key: CALCULATOR_PRICES_KEY, value: JSON.stringify(parsed), updatedAt: now, updatedBy })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(parsed), updatedAt: now, updatedBy },
    });

  invalidateCalculatorPriceCache();
  return { ok: true };
}
