import { getDecoratorListingHtml } from "../../lib/decorator-mirror";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ decorCity: string }>;
  }
) {
  const { decorCity } = await params;
  const html = await getDecoratorListingHtml(decorCity);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
