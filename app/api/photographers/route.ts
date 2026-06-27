import { queryPhotographers } from "../../lib/photographer-data";

export const dynamic = "force-dynamic";

const PUBLIC_LIST_CACHE =
  "public, max-age=60, s-maxage=900, stale-while-revalidate=86400";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await queryPhotographers(searchParams);
  return Response.json(result, {
    headers: {
      "cache-control": PUBLIC_LIST_CACHE,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow, noarchive"
    }
  });
}
