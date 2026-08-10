import { calculatorData } from "../../worker/calculator-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "cache-control": "public, max-age=300",
};

export function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (!query) {
    return Response.json([], { headers: JSON_HEADERS });
  }

  const results = calculatorData.searchIndex
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
