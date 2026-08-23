import { CALCULATOR_CACHE_CONTROL, loadCalculatorDataset } from "@/worker/site/calculator-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The calculator's data files, served from the database.
 *
 * The homepage and /hotel-cost-calculator do not go through
 * currency-switcher.js: each has its own inline loader that fetches these paths
 * directly. Rather than edit the same calculator in several pages, the paths
 * themselves answer from the database, so every page gets edited prices
 * whichever route it takes.
 *
 * The matching files under site-public have been deleted. A rewrite in
 * vite.config.ts already put this handler in front of them, so they were dead
 * weight, but a second copy of the price table on disk is exactly the thing an
 * admin edit cannot reach -- keeping it would have meant a build could ship
 * stale prices the moment that rewrite were ever misconfigured.
 */
const FILES = ["cities.json", "hotels.json", "hotels-by-city.json", "prices.json", "currencies.json", "taxes.json"] as const;
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

  const source = await loadCalculatorDataset();

  const body =
    file === "cities.json" ? source.cities
    : file === "hotels.json" ? source.hotels
    : file === "hotels-by-city.json" ? source.hotelsByCity
    : file === "prices.json" ? source.prices
    : file === "taxes.json" ? source.taxes
    : source.currencies;

  return Response.json(body, {
    headers: { "cache-control": CALCULATOR_CACHE_CONTROL },
  });
}
