import { loadCalculatorDataset } from "@/worker/site/calculator-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The whole calculator dataset, in the shape the public pages already expect.
 *
 * The calculator scripts on ~270 pages ask for cities, the hotels in a city and
 * the price table. They used to read three static JSON files; this serves the
 * same three structures from the database in one request, so a price edited in
 * the admin panel is live rather than waiting for a redeploy.
 */
export async function GET(): Promise<Response> {
  const data = await loadCalculatorDataset();

  return Response.json(
    {
      cities: data.cities,
      hotels: data.hotels,
      hotelsByCity: data.hotelsByCity,
      prices: data.prices,
      currencies: data.currencies,
    },
    {
      headers: {
        // Short: an admin edit should show up quickly, and the payload is
        // served from the same region as the database.
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
