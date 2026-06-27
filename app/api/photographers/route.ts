import { queryPhotographers } from "../../lib/photographer-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await queryPhotographers(searchParams);
  return Response.json(result, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=900"
    }
  });
}
