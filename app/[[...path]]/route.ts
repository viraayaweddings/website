import handler from "vinext/server/app-router-entry";
import { getSessionUser } from "@/worker/admin/session";
import { getDb } from "@/worker/db/client";
import { isAppOwnedPath } from "@/worker/site/app-routes";
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

/**
 * Marks the request this handler passes to the App Router.
 *
 * This route is an optional catch-all, so it also matches every app-owned path
 * the App Router itself has no route for. Handing such a request over sends it
 * straight back here, and it recurses until the invocation times out. The
 * marked request is answered with a 404 on re-entry instead.
 */
const DELEGATED_HEADER = "x-vw-delegated";

async function serve(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // `.fetch`, not a call: the entry's default export is an object, so calling
  // it threw.
  //
  // Only app-owned paths are delegated. An RSC or prefetch header on a public
  // path used to be delegated too, but there is no App Router page behind any
  // of them -- the app router resolves them straight back to this handler, so
  // it recursed until the invocation timed out. Those requests are served the
  // page like any other, and the client falls back to a full navigation.
  if (isAppOwnedPath(pathname)) {
    // Second time through means the App Router matched nothing but this route.
    if (request.headers.get(DELEGATED_HEADER) === "1") {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers(request.headers);
    headers.set(DELEGATED_HEADER, "1");
    // GET and HEAD only, so there is no body to forward.
    return handler.fetch(new Request(request.url, { method: request.method, headers }));
  }

  const redirectTarget = publicRedirectTarget(pathname);
  if (redirectTarget) {
    return Response.redirect(new URL(redirectTarget, url.origin), 301);
  }

  const wantsShellOnly = request.headers.get(SHELL_HEADER) === "1";

  if (!wantsShellOnly) {
    // `?preview=1` renders the stored version of something that is not live --
    // a draft venue or article, a hidden city or page -- so the panel's preview
    // links have something to show. It is gated on a real admin session and the
    // response is uncached and noindex; a visitor without one gets the ordinary
    // page, exactly as if the parameter were not there.
    if (url.searchParams.get("preview") === "1" && (await isSignedIn(request))) {
      const previewed = await renderFromDatabase(pathname, url.origin, { preview: true });
      if (previewed) return respond(previewed, request);
    }

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

/** Whether this request carries a live admin session cookie. */
async function isSignedIn(request: Request): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    return Boolean(await getSessionUser(db, request));
  } catch {
    return false;
  }
}

/**
 * The page's untouched markup. On Vercel the static files live on the CDN
 * rather than beside the function, so they are fetched back through the origin;
 * locally they are read straight off disk.
 */
async function readOriginalPage(url: URL): Promise<Response | null> {
  if (process.env.VERCEL) {
    const headers: Record<string, string> = { [SHELL_HEADER]: "1" };

    // A protected deployment answers its own origin with a login redirect, so
    // without this the fallback stalls on preview builds while production is
    // fine -- exactly the sort of difference that only shows up once deployed.
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) headers["x-vercel-protection-bypass"] = bypass;

    const response = await fetch(new URL(url.pathname, url.origin), {
      headers,
      // A redirect here is never the page: on a protected deployment it is the
      // login screen, and serving that as site content would be worse than
      // having no fallback at all.
      redirect: "manual",
      // Bounded so a slow origin costs a fallback, not the whole invocation.
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!response || !response.ok) return null;
    if (!response.headers.get("content-type")?.includes("text/html")) return null;
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
