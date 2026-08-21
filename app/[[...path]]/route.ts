import handler from "vinext/server/app-router-entry";
import { isAppOwnedPath, isNextInternalRequest } from "@/worker/site/app-routes";
import { publicRedirectTarget } from "@/worker/site/public-routes";
import { cacheControlFor, readStaticFile } from "@/worker/site/serve-static";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function serve(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (isAppOwnedPath(pathname) || isNextInternalRequest(request)) {
    return handler(request);
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
  if (file) {
    return new Response(request.method === "HEAD" ? null : new Uint8Array(file.body), {
      status: 200,
      headers: {
        "content-type": file.contentType,
        "cache-control": cacheControlFor(file.contentType),
      },
    });
  }

  const notFound = await readStaticFile("/404.html");
  if (notFound) {
    return new Response(request.method === "HEAD" ? null : new Uint8Array(notFound.body), {
      status: 404,
      headers: {
        "content-type": notFound.contentType,
        "cache-control": cacheControlFor(notFound.contentType),
      },
    });
  }

  return new Response("Not found", { status: 404 });
}

export async function GET(request: Request): Promise<Response> {
  return serve(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return serve(request);
}
