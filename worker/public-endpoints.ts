/**
 * Shared public API handlers used by the Worker and Vinext dev routes.
 */
import { getCalculatorData, getIndiaHotelIds } from "./calculator-runtime";
export { legacyLeadGetResponse, LEGACY_LEAD_PATHS, withDeprecatedLeadHeaders } from "./legacy-lead";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300",
};

export async function searchHotels(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (!query) return Response.json([], { headers: JSON_HEADERS });

  const [data, indiaHotelIds] = await Promise.all([getCalculatorData(), getIndiaHotelIds()]);
  const results = data.searchIndex
    .filter((hotel) => indiaHotelIds.has(String(hotel.id)))
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
