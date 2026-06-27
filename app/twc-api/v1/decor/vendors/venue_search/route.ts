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

  // queryDecorators matches against the broad searchText (name + address + tags),
  // which can surface vendors whose NAME doesn't contain the term. Over-fetch and
  // re-rank so name matches come first; only fall back to the broader matches when
  // there aren't enough name matches to fill the dropdown.
  const result = await queryDecorators({
    search: vendorName,
    ...(cityName ? { city: cityName } : {}),
    page: "1",
    limit: "30"
  });

  const term = vendorName.toLowerCase();
  const score = (name: string) => {
    const n = (name || "").toLowerCase();
    if (n.startsWith(term)) return 0;
    if (n.includes(term)) return 1;
    return 2;
  };

  const ranked = result.results
    .map((vendor) => ({
      label: vendor.venueName,
      slug: vendor.urlSlug,
      citySlug: vendor.citySlug,
      _score: score(vendor.venueName)
    }))
    .sort((a, b) => a._score - b._score);

  // If any vendor name actually matches, drop the unrelated searchText-only hits.
  const nameMatches = ranked.filter((r) => r._score < 2);
  const chosen = (nameMatches.length ? nameMatches : ranked).slice(0, 8);

  const results = chosen.map(({ label, slug, citySlug }) => ({ label, slug, citySlug }));

  return Response.json({ results }, { headers: searchHeaders });
}

const searchHeaders = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive"
} as const;
