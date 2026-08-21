import { NextRequest, NextResponse } from "next/server";
import { publicRedirectTarget } from "@/worker/site/public-routes";
import { cacheControlFor, readStaticFile } from "@/worker/site/serve-static";

const APP_OWNED_PREFIXES = [
  "/admin",
  "/api",
  "/assets",
  "/_vinext",
  "/contact/save",
  "/blog-form-submit",
  "/get_in_touch",
  "/hotel-search",
  "/media",
];

function isAppOwned(pathname: string): boolean {
  return APP_OWNED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isNextInternal(request: NextRequest): boolean {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Next-Action") != null ||
    (request.headers.get("accept")?.includes("text/x-component") ?? false)
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isAppOwned(pathname) || isNextInternal(request)) {
    return NextResponse.next();
  }

  if (pathname === "/wedding-consultation") {
    const url = request.nextUrl.clone();
    url.pathname = "/wedding-consultation/";
    return NextResponse.redirect(url.toString(), 308);
  }

  const redirectTarget = publicRedirectTarget(pathname);
  if (redirectTarget) {
    return NextResponse.redirect(new URL(redirectTarget, request.url), 301);
  }

  const file = await readStaticFile(pathname);
  if (file) {
    return new NextResponse(request.method === "HEAD" ? null : new Uint8Array(file.body), {
      status: 200,
      headers: {
        "content-type": file.contentType,
        "cache-control": cacheControlFor(file.contentType),
      },
    });
  }

  const notFound = await readStaticFile("/404.html");
  if (notFound) {
    return new NextResponse(request.method === "HEAD" ? null : new Uint8Array(notFound.body), {
      status: 404,
      headers: {
        "content-type": notFound.contentType,
        "cache-control": cacheControlFor(notFound.contentType),
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
