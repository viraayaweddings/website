import { calculatorData } from "../../worker/calculator-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "cache-control": "public, max-age=300",
};
const INDIA_CITY_IDS = new Set([
  "8", "28", "70", "32", "31", "69", "34", "23", "17", "40", "67", "13", "18", "46", "15", "4",
  "7", "36", "43", "44", "27", "47", "5", "9", "12", "6", "71", "55", "24", "51", "21", "56",
  "72", "19", "25", "20", "68", "73", "1", "26", "10", "2", "16", "30", "35", "33", "11",
  "42", "14", "29", "22", "3", "41",
]);
const INDIA_HOTEL_IDS = new Set(
  Object.entries(calculatorData.hotelsByCity)
    .filter(([cityId]) => INDIA_CITY_IDS.has(String(cityId)))
    .flatMap(([, hotels]) => hotels.map((hotel) => String(hotel.id))),
);

export function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (!query) {
    return Response.json([], { headers: JSON_HEADERS });
  }

  const results = calculatorData.searchIndex
    .filter((hotel) => INDIA_HOTEL_IDS.has(String(hotel.id)))
    .filter((hotel) => hotel.hotel_name.toLowerCase().includes(query))
    .sort((a, b) => a.hotel_name.localeCompare(b.hotel_name, "en", { sensitivity: "base" }))
    .slice(0, 8)
    .map((hotel) => ({
      id: hotel.id,
      hotel_name: hotel.hotel_name,
      city: null,
    }));

  return Response.json(results, { headers: JSON_HEADERS });
}
