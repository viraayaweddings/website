import { getMirrorHtml } from "../../../lib/venue-mirror";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ venueCityOrFilter: string; venueLocalityOrDetailOrFilter: string }>;
  }
) {
  const { venueCityOrFilter, venueLocalityOrDetailOrFilter } = await params;
  const html = await getMirrorHtml(venueCityOrFilter, venueLocalityOrDetailOrFilter);
  if (!html) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate"
    }
  });
}
