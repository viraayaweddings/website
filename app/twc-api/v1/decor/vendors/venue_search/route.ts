import { queryDecorators } from "../../../../../lib/decorator-data";

export const dynamic = "force-dynamic";

// The mirrored TWC hero search box (useGetSearchedVenues) hits this endpoint as
// /vendors/venue_search/?vendorName=<term>&cityName=<city>. Its React Query
// applies `select: e => e.results`, and each result is rendered as { label, slug,
// citySlug } — clicking one navigates to /wedding-decorators/<citySlug>/<slug>.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorName = (searchParams.get("vendorName") || "").trim();
  const cityName = (searchParams.get("cityName") || "").trim();

  if (!vendorName) {
    return Response.json({ results: [] }, { headers: searchHeaders });
  }

  const result = await queryDecorators({
    search: vendorName,
    ...(cityName ? { city: cityName } : {}),
    page: "1",
    limit: "8"
  });

  const results = result.results.map((vendor) => ({
    label: vendor.venueName,
    slug: vendor.urlSlug,
    citySlug: vendor.citySlug
  }));

  return Response.json({ results }, { headers: searchHeaders });
}

const searchHeaders = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive"
} as const;
