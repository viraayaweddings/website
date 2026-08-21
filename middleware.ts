import { NextRequest, NextResponse } from "next/server";
import { publicRedirectTarget } from "@/worker/site/public-routes";

/** Edge-safe redirects only — static HTML is served by the Node catch-all route. */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname === "/wedding-consultation") {
    const url = request.nextUrl.clone();
    url.pathname = "/wedding-consultation/";
    return NextResponse.redirect(url.toString(), 308);
  }

  const redirectTarget = publicRedirectTarget(pathname);
  if (redirectTarget) {
    return NextResponse.redirect(new URL(redirectTarget, request.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wedding-consultation",
    "/appointment-booking/:path*",
    "/blogs/category/weeding-planning/:path*",
    "/appointment/payment-success/:path*",
    "/appointment/payment-failed/:path*",
  ],
};
