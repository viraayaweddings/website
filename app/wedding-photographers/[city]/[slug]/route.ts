import { getMirrorHtml } from "../../../lib/photographer-mirror";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ city: string; slug: string }>;
  }
) {
  const { city, slug } = await params;
  const html = await getMirrorHtml(city, slug);
  if (!html) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
