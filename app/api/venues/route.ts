import { NextRequest, NextResponse } from "next/server";
import { queryVenues } from "../../lib/venue-data";

export const dynamic = "force-dynamic";

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
        "cache-control": "private, max-age=60, stale-while-revalidate=300"
      }
    }
  );
}
