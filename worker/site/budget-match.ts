/**
 * Prices every hotel in a city against one enquiry, and says which fit a budget.
 *
 * The calculators used to ask the visitor to pick a hotel and then quote that
 * one hotel. They now ask for a place, the dates, the rooms and meals per day,
 * and a whole-stay budget band -- so the question is no longer "what does this
 * hotel cost" but "which hotels in this place come in under this number". That
 * is the same arithmetic run once per hotel instead of once, which is why it
 * lives on the server rather than in the page scripts: five drifted copies of a
 * per-hotel formula was already the calculator's worst problem, and a per-city
 * one would have been five copies of a loop over it.
 *
 * Server-side for a second reason. Answering it in the browser means shipping
 * the whole 3,100-cell price table to every visitor who touches the widget.
 *
 * The formula itself, and everything done to a request before it is trusted, is
 * in budget-formula.ts, which reaches nothing and so can be tested directly.
 * This file is the part that needs the database.
 *
 * Rates are per hotel per calendar month, resolved from the check-in month. A
 * stay that crosses a month boundary is priced at the check-in month's rate,
 * which is what all three calculators did before this.
 */
import { loadCalculatorDataset, type BudgetRow } from "./calculator-store";
import {
  fitsBand,
  monthFromDate,
  multiplierFor,
  peakRooms,
  subtotalFor,
  type DayInput,
} from "./budget-formula";

export interface MatchedHotel {
  id: number;
  name: string;
  total_rooms: number;
  /** Before tax. */
  subtotal: number;
  /** After every published tax line. */
  total: number;
  /** Inside the selected band. True for every priced hotel when no band was picked. */
  fits: boolean;
  /**
   * The stay asks for more rooms on some day than the hotel has.
   *
   * Reported rather than dropped: "this venue only has 84 rooms" is the answer
   * to why it is missing from a list the visitor expected it in.
   */
  over_capacity: boolean;
}

export interface BudgetMatchResult {
  ok: true;
  city: { id: number; name: string } | null;
  /** The check-in month the rates were read from. */
  month: string;
  nights: number;
  budget: BudgetRow | null;
  /**
   * The tax lines folded into every `total`, so the panel can say which.
   *
   * Sent rather than assumed: an admin who unpublishes both lines gets totals
   * that are subtotals, and a panel still captioned "taxes included" would be
   * the one wrong number on the page.
   */
  taxes: Array<{ label: string; percent: number }>;
  /** Every priced hotel in the city, cheapest first. */
  hotels: MatchedHotel[];
  /**
   * Hotels in the city with no room rate, or none for this month.
   *
   * Kept separate rather than priced at zero, which is the same call
   * currency-switcher.js's "Price on request" panel makes: a hotel the site has
   * never costed is not a free one.
   */
  unpriced: Array<{ id: number; name: string }>;
}

export interface BudgetMatchInput {
  cityId: string;
  checkIn: string;
  budgetCode: string;
  days: DayInput[];
}

export async function matchBudget(input: BudgetMatchInput): Promise<BudgetMatchResult> {
  const data = await loadCalculatorDataset();
  const month = monthFromDate(input.checkIn);
  const days = input.days;

  const cityId = String(input.cityId || "").trim();
  const city = data.cities.find((row) => String(row.id) === cityId) ?? null;
  const budget = data.budgets.find((row) => row.code === input.budgetCode) ?? null;
  const multiplier = multiplierFor(data.taxes);
  const wanted = peakRooms(days);

  const hotels: MatchedHotel[] = [];
  const unpriced: Array<{ id: number; name: string }> = [];

  for (const hotel of data.hotelsByCity[cityId] ?? []) {
    const subtotal = subtotalFor(days, data.prices[String(hotel.id)]?.[month]);

    // Zero here is a hotel with no rate card for this month, or none at all --
    // 33 published hotels are in that state. Either way it is "price on
    // request", not a wedding that costs nothing.
    if (subtotal <= 0) {
      unpriced.push({ id: hotel.id, name: hotel.name });
      continue;
    }

    const total = subtotal * multiplier;
    const overCapacity = hotel.total_rooms > 0 && wanted > hotel.total_rooms;

    hotels.push({
      id: hotel.id,
      name: hotel.name,
      total_rooms: hotel.total_rooms,
      subtotal,
      total,
      fits: !overCapacity && fitsBand(total, budget),
      over_capacity: overCapacity,
    });
  }

  hotels.sort((a, b) => a.total - b.total);

  return {
    ok: true,
    city: city ? { id: city.id, name: city.name } : null,
    month,
    nights: days.length,
    budget,
    taxes: data.taxes.map((tax) => ({ label: tax.label, percent: tax.percent })),
    hotels,
    unpriced,
  };
}
