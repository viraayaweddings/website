import { getDecoratorCities } from "../../../../../lib/decorator-data";

export const dynamic = "force-dynamic";

const cityCenters: Record<string, [number, number]> = {
  bengaluru: [77.5946, 12.9716],
  delhi: [77.1025, 28.7041],
  gurugram: [77.0266, 28.4595],
  noida: [77.391, 28.5355],
  jaipur: [75.7873, 26.9124],
  mumbai: [72.8777, 19.076],
  goa: [74.124, 15.2993]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const citySlug = (searchParams.get("citySlug") || "bengaluru").toLowerCase();
  const known = cityCenters[citySlug];
  const cities = known ? [] : await getDecoratorCities();
  const fallbackSlug = cities[0]?.slug || "bengaluru";
  const coordinates = known || cityCenters[fallbackSlug] || cityCenters.bengaluru;

  return Response.json(
    { citySlug, coordinates },
    {
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive"
      }
    }
  );
}
