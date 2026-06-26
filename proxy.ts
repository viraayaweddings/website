import { NextRequest, NextResponse } from "next/server";

function isSameHost(value: string | null, request: NextRequest) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function isAllowedSiteRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    return fetchSite === "same-origin" || fetchSite === "same-site";
  }

  return (
    isSameHost(request.headers.get("origin"), request) ||
    isSameHost(request.headers.get("referer"), request)
  );
}

function forbiddenResponse() {
  return new NextResponse("Forbidden", {
    status: 403,
    headers: {
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow, noarchive"
    }
  });
}

export function proxy(request: NextRequest) {
  if (!isAllowedSiteRequest(request)) {
    return forbiddenResponse();
  }

  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    response.headers.set("cache-control", "private, no-store");
  }
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  response.headers.set("vary", "Sec-Fetch-Site, Origin, Referer");
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/twc-api/:path*",
    "/twc-image-proxy/:path*",
    "/venue-assets/:path*"
  ]
};
