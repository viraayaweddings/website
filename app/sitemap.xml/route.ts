/**
 * sitemap.xml, built from the database.
 *
 * A generated file shipped with the clone and was what actually served, so a
 * venue or article added after the clone never appeared in it. The builder
 * existed; nothing routed to it.
 */
import { buildSitemapXml } from "@/worker/site/sitemap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const xml = await buildSitemapXml(origin, {});

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Long enough to absorb a crawl, short enough that a new post is not
      // missing for a day.
      "cache-control": "public, max-age=300",
    },
  });
}
