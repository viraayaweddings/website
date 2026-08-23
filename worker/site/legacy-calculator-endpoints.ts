/**
 * The calculator endpoints the cloned pages still call.
 *
 * check-hotel-availability, compare-hotel, the destination-wedding-in-<city>
 * pages and every hotel detail page were written against a PHP backend and
 * fetch these paths directly. None of them had a handler after the port, so the
 * city -> hotel dropdown never populated (which blocks the availability
 * enquiry entirely) and every hotel cost calculator quietly priced at zero.
 *
 * They answer from the same database-backed dataset as /data/calculator/*.json,
 * so an admin's price edit reaches these pages too. Response shapes are dictated
 * by the page scripts, which cannot be changed per page -- see the comments on
 * each handler.
 *
 * There is no bundled fallback behind any of these. An empty answer here reads
 * to the visitor as "nothing to price", which currency-switcher.js turns into
 * the "Price on request" overlay; a fallback would instead quote confidently
 * from prices frozen at the clone.
 */
import {
  loadCalculatorConfig,
  loadCalculatorDataset,
  type CalculatorConfig,
  type CalculatorDataset,
  type HotelRow,
  type PriceCell,
} from "./calculator-store";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300",
};

/** Consultation slots offered by /appointment-booking and /wedding-consultation. */
export const CONSULTATION_SLOT_TIMES = [
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const EMPTY_PRICE: PriceCell = {
  room_price: "0.00",
  lunch_price: "0.00",
  hitea_price: "0.00",
  dinner_price: "0.00",
};

/** The price table. Only the two price handlers need it. */
async function dataset(): Promise<CalculatorDataset> {
  return loadCalculatorDataset();
}

/** Everything but the price table, which is all the list handlers read. */
async function config(): Promise<CalculatorConfig> {
  return loadCalculatorConfig();
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

/** GET /appointment/slots */
export function consultationSlots(): Response {
  return json([...CONSULTATION_SLOT_TIMES]);
}

/** GET /get-cities?search=<term> — select2 on /compare-hotel reads {id, name}. */
export async function getCities(request: Request): Promise<Response> {
  const search = (new URL(request.url).searchParams.get("search") || "").trim().toLowerCase();
  const { cities } = await config();
  const matches = search ? cities.filter((city) => city.name.toLowerCase().includes(search)) : cities;
  return json(matches.map((city) => ({ id: city.id, name: city.name })));
}

/**
 * The hotel list for one city.
 *
 * Three pages read three different key names off these rows -- `name` on the
 * city pages, `hotel_name` on /compare-hotel, `name || hotel_name` on
 * /check-hotel-availability -- so every row carries both.
 */
function hotelPayload(hotel: HotelRow) {
  return {
    id: hotel.id,
    name: hotel.name,
    hotel_name: hotel.name,
    total_rooms: hotel.total_rooms,
  };
}

/** GET /get-hotels-by-city/<cityId>, or /get-hotels-by-city?city=<cityId>. */
export async function getHotelsByCity(request: Request, cityId?: string): Promise<Response> {
  const id = (cityId ?? new URL(request.url).searchParams.get("city") ?? "").trim();
  if (!id) return json([]);
  const { hotelsByCity } = await config();
  return json((hotelsByCity[id] ?? []).map(hotelPayload));
}

function monthName(value: string): string | null {
  const raw = value.trim();
  const matched = MONTHS.find((month) => month.toLowerCase() === raw.toLowerCase());
  return matched ?? null;
}

/**
 * GET /get-hotel-price/<hotelId>/<Month>
 *
 * The hotel detail calculator sends the check-in month's English long name. A
 * hotel with no price for that month answers with zeroes, which is what its
 * error branch already falls back to -- a 404 would only make the same total.
 */
export async function getHotelPrice(hotelId: string, month: string): Promise<Response> {
  const resolved = monthName(month);
  if (!resolved) return json(EMPTY_PRICE);
  const { prices } = await dataset();
  return json(prices[String(hotelId).trim()]?.[resolved] ?? EMPTY_PRICE);
}

/** Parses `checkin` as flatpickr writes it on /compare-hotel: DD-MM-YYYY. */
function monthFromCheckin(value: string): string {
  const parts = value.trim().split(/[-/]/);
  const month = Number(parts[1]);
  if (parts.length === 3 && month >= 1 && month <= 12) return MONTHS[month - 1];
  return MONTHS[new Date().getMonth()];
}

/**
 * POST /get-hotel-prices — form-encoded `hotel_ids[]` plus `checkin`.
 *
 * /compare-hotel reads `prices[0]` for the rates and
 * `prices[0].hotel.city.name` for the column subtitle, so the nesting is kept
 * even though nothing else uses it.
 */
export async function getHotelPrices(request: Request): Promise<Response> {
  const form = await request.formData();
  const ids = [...form.getAll("hotel_ids[]"), ...form.getAll("hotel_ids")]
    .map((value) => String(value).trim())
    .filter(Boolean);
  const month = monthFromCheckin(String(form.get("checkin") || ""));

  const data = await dataset();
  const cityNameById = new Map(data.cities.map((city) => [String(city.id), city.name]));
  const cityByHotel = new Map<string, string>();
  for (const [cityId, hotels] of Object.entries(data.hotelsByCity)) {
    for (const hotel of hotels) cityByHotel.set(String(hotel.id), cityNameById.get(cityId) || "");
  }

  const rows = ids
    .map((id) => {
      const hotel = data.hotels.find((candidate) => String(candidate.id) === id);
      if (!hotel) return null;
      const price = data.prices[id]?.[month];
      return {
        id: hotel.id,
        hotel_name: hotel.name,
        total_rooms: hotel.total_rooms,
        prices: price
          ? [{ ...price, month, hotel: { city: { name: cityByHotel.get(id) || "" } } }]
          : [],
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return json(rows);
}
