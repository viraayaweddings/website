import handler from "vinext/server/app-router-entry";
import { isAppOwnedPath, isNextInternalRequest } from "@/worker/site/app-routes";
import { publicRedirectTarget } from "@/worker/site/public-routes";
import { applyManagedContent, renderFromDatabase } from "@/worker/site/render-page";
import { cacheControlFor, readStaticFile } from "@/worker/site/serve-static";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Marks the request this handler makes back to its own origin for a page's
 * original markup. The deploy config routes managed paths here *unless* this
 * header is set, so the marked request reaches the static file instead of
 * looping back into this handler.
 */
const SHELL_HEADER = "x-vw-shell";

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

  const wantsShellOnly = request.headers.get(SHELL_HEADER) === "1";

  if (!wantsShellOnly) {
    const fromDatabase = await renderFromDatabase(pathname, url.origin);
    if (fromDatabase) return respond(fromDatabase, request);
  }

  const original = await readOriginalPage(url);
  if (original) {
    if (wantsShellOnly) return respond(original, request);
    return respond(await applyManagedContent(original, pathname, url.origin), request);
  }

  const notFound = await readOriginalPage(new URL("/404.html", url.origin));
  if (notFound) {
    return respond(
      new Response(notFound.body, { status: 404, headers: notFound.headers }),
      request,
    );
  }

  return new Response("Not found", { status: 404 });
}

/**
 * The page's untouched markup. On Vercel the static files live on the CDN
 * rather than beside the function, so they are fetched back through the origin;
 * locally they are read straight off disk.
 */
async function readOriginalPage(url: URL): Promise<Response | null> {
  if (process.env.VERCEL) {
    const response = await fetch(new URL(url.pathname, url.origin), {
      headers: { [SHELL_HEADER]: "1" },
    }).catch(() => null);

    if (!response || !response.ok) return null;
    return response;
  }

  const file = await readStaticFile(url.pathname);
  if (!file) return null;

  return new Response(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "cache-control": cacheControlFor(file.contentType),
    },
  });
}

/** A HEAD response carries the headers of the GET it stands in for, with no body. */
function respond(response: Response, request: Request): Response {
  if (request.method !== "HEAD") return response;
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function GET(request: Request): Promise<Response> {
  return serve(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return serve(request);
}
