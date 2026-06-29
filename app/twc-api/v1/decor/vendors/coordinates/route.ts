import { isAllowedCitySlug, normalizeCitySlug } from "../../../../../lib/allowed-cities";

export const dynamic = "force-dynamic";

const cityCenters: Record<string, [number, number]> = {
  delhi: [77.1025, 28.7041],
  gurugram: [77.0266, 28.4595],
  noida: [77.391, 28.5355],
  jaipur: [75.7873, 26.9124],
  udaipur: [73.7125, 24.5854]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCitySlug = normalizeCitySlug(searchParams.get("citySlug") || "delhi");
  const citySlug = isAllowedCitySlug(requestedCitySlug) ? requestedCitySlug : "delhi";
  const coordinates = cityCenters[citySlug] || cityCenters.delhi;

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
