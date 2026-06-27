import { NextRequest, NextResponse } from "next/server";
import { queryVenues } from "../../lib/venue-data";

export const dynamic = "force-dynamic";

const PUBLIC_LIST_CACHE =
  "public, max-age=60, s-maxage=900, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const result = await queryVenues(request.nextUrl.searchParams);
  return NextResponse.json(
    {
      size: result.size,
      nextPageUrl: result.nextPageUrl,
      page: result.page,
      limit: result.limit,
      results: result.results
    },
    {
      headers: {
        "cache-control": PUBLIC_LIST_CACHE,
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive"
      }
    }
  );
}
