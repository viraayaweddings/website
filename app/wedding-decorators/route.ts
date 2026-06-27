import { getDecoratorListingHtml } from "../lib/decorator-mirror";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const html = await getDecoratorListingHtml();
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
