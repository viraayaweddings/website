/**
 * Shared public API handlers used by the Worker and Vinext dev routes.
 */
import { CALCULATOR_CACHE_CONTROL, loadCalculatorConfig } from "./site/calculator-store";
export { legacyLeadGetResponse, LEGACY_LEAD_PATHS, withDeprecatedLeadHeaders } from "./legacy-lead";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": CALCULATOR_CACHE_CONTROL,
};

/**
 * The header search box.
 *
 * Reads the same published hotel list the calculators do. It used to read the
 * bundled table through a hardcoded allowlist of "India" city ids, so renaming
 * a venue, unpublishing one or adding one never changed what the box suggested.
 * Publication is now what decides it, which is the same switch the pickers obey.
 */
export async function searchHotels(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (!query) return Response.json([], { headers: JSON_HEADERS });

  const { hotels } = await loadCalculatorConfig();
  const results = hotels
    .filter((hotel) => hotel.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
    .slice(0, 8)
    .map((hotel) => ({
      id: hotel.id,
      hotel_name: hotel.name,
      city: null,
    }));

  return Response.json(results, { headers: JSON_HEADERS });
}
