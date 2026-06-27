import { getDecoratorDetailHtml } from "../../../lib/decorator-mirror";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ decorCity: string; decorLocalityOrCategorySlug: string }>;
  }
) {
  const { decorCity, decorLocalityOrCategorySlug } = await params;
  const html = await getDecoratorDetailHtml(decorCity, decorLocalityOrCategorySlug);
  if (!html) return new Response("Not found", { status: 404 });
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
