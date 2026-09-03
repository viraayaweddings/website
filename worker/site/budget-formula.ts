/**
 * What the budget match does to a request before it prices anything.
 *
 * Kept apart from budget-match.ts, which reaches the database and so cannot be
 * imported by a plain node test -- the same split lead-fields.ts and
 * lead-email.ts already make. This is the half worth pinning: the cost formula
 * the calculators have always used, and the re-derivation of a day grid that
 * arrived over the wire.
 *
 * The formula, unchanged from the five inline copies it replaces:
 *
 *   dayTotal = rooms x room_price + lunch x lunch_price
 *            + hitea x hitea_price + dinner x dinner_price
 *   subtotal = the sum over the stay
 *   total    = subtotal + every published tax line
 */

/** One day of the grid, as the widget collects it. */
export interface DayInput {
  rooms: number;
  lunch: number;
  hitea: number;
  dinner: number;
}

/** The four rates for one hotel in one month, as the price table stores them. */
export interface RateCard {
  room_price: string;
  lunch_price: string;
  hitea_price: string;
  dinner_price: string;
}

/** A whole-stay budget band. `max` null means the band has no ceiling. */
export interface Band {
  min: number;
  max: number | null;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** The `d-m-Y` strings flatpickr writes into `#checkIn` on every calculator. */
export function monthFromDate(value: string): string {
  const parts = String(value || "").trim().split(/[-/]/);
  const month = Number(parts[1]);
  if (parts.length === 3 && month >= 1 && month <= 12) return MONTHS[month - 1];
  return MONTHS[new Date().getMonth()];
}

function count(value: unknown): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  // No venue in the dataset has 100,000 rooms, and no wedding seats 100,000 to
  // lunch. Past this a figure is a typo or a probe, and carrying it through
  // only produces a nonsense total.
  return Math.min(parsed, 100_000);
}

/** Trusts nothing from the request body: every field is re-derived here. */
export function normalizeDays(value: unknown): DayInput[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 31).map((day) => {
    const record = (day ?? {}) as Record<string, unknown>;
    return {
      rooms: count(record.rooms),
      lunch: count(record.lunch),
      hitea: count(record.hitea ?? record.hi_tea),
      dinner: count(record.dinner),
    };
  });
}

/** True when at least one box in the grid carries a number. */
export function hasAnyInput(days: DayInput[]): boolean {
  return days.some((day) => day.rooms > 0 || day.lunch > 0 || day.hitea > 0 || day.dinner > 0);
}

/** The stay's cost before tax, at one hotel's rates for one month. */
export function subtotalFor(days: DayInput[], rates: RateCard | undefined): number {
  if (!rates) return 0;
  const room = parseFloat(rates.room_price) || 0;
  const lunch = parseFloat(rates.lunch_price) || 0;
  const hitea = parseFloat(rates.hitea_price) || 0;
  const dinner = parseFloat(rates.dinner_price) || 0;

  return days.reduce(
    (sum, day) => sum + day.rooms * room + day.lunch * lunch + day.hitea * hitea + day.dinner * dinner,
    0,
  );
}

/** 1.18 for the site's CGST 9% + SGST 9%, and whatever an admin makes it. */
export function multiplierFor(taxes: ReadonlyArray<{ percent: number }>): number {
  const percent = taxes.reduce((sum, tax) => sum + (Number(tax.percent) || 0), 0);
  return 1 + percent / 100;
}

/** No band selected matches everything; the top band may be open-ended. */
export function fitsBand(total: number, band: Band | null): boolean {
  if (!band) return true;
  if (total < band.min) return false;
  return band.max === null || total <= band.max;
}

/** The most rooms any single day of the stay asks for. */
export function peakRooms(days: DayInput[]): number {
  return days.reduce((most, day) => Math.max(most, day.rooms), 0);
}
