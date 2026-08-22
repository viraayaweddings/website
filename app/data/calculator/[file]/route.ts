import { calculatorData } from "@/worker/calculator-data";
import { loadCalculatorDataset } from "@/worker/site/calculator-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The calculator's data files, served from the database.
 *
 * The homepage and /hotel-cost-calculator do not go through
 * currency-switcher.js: each has its own inline loader that fetches these paths
 * directly. Rather than edit the same calculator in several pages, the paths
 * themselves now answer from the database, so every page gets edited prices
 * whichever route it takes.
 *
 * The files still exist under site-public. A rewrite puts this handler in front
 * of them, and they are what ships if the database has never been seeded.
 */
const FILES = ["cities.json", "hotels.json", "hotels-by-city.json", "prices.json", "currencies.json"] as const;
type FileName = (typeof FILES)[number];

function isKnown(name: string): name is FileName {
  return (FILES as readonly string[]).includes(name);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  if (!isKnown(file)) return new Response("Not found", { status: 404 });

  const data = await loadCalculatorDataset();

  // An unseeded database would otherwise price every calculator at zero.
  const seeded = data.hotels.length > 0 || Object.keys(data.prices).length > 0;
  const source = seeded
    ? data
    : (calculatorData as unknown as {
        cities: unknown;
        hotels: unknown;
        hotelsByCity: unknown;
        prices: unknown;
        currencies: unknown;
      });

  const body =
    file === "cities.json" ? source.cities
    : file === "hotels.json" ? source.hotels
    : file === "hotels-by-city.json" ? source.hotelsByCity
    : file === "prices.json" ? source.prices
    : source.currencies;

  return Response.json(body, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
