import { publicRedirectTarget } from "@/worker/site/public-routes";
import { cacheControlFor, readStaticFile } from "@/worker/site/serve-static";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function serve(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // App Router owns these prefixes. If this handler ever runs for them, bail out
  // so Vinext can resolve the admin/API route instead of serving a static 404.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_vinext/") ||
    pathname.startsWith("/contact/save") ||
    pathname.startsWith("/blog-form-submit") ||
    pathname.startsWith("/get_in_touch/") ||
    pathname.startsWith("/hotel-search") ||
    pathname.startsWith("/media/")
  ) {
    return new Response(null, { status: 404 });
  }

  if (pathname === "/wedding-consultation") {
    url.pathname = "/wedding-consultation/";
    return Response.redirect(url, 308);
  }

  const redirectTarget = publicRedirectTarget(pathname);
  if (redirectTarget) {
    return Response.redirect(new URL(redirectTarget, url.origin), 301);
  }

  const file = await readStaticFile(pathname);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(request.method === "HEAD" ? null : file.body, {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "cache-control": cacheControlFor(file.contentType),
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  return serve(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return serve(request);
}
