/** Paths handled by the App Router (admin, APIs, uploads) — not static HTML. */
export const APP_OWNED_PREFIXES = [
  "/admin",
  "/api",
  "/assets",
  "/_vinext",
  "/contact/save",
  "/blog-form-submit",
  "/get_in_touch",
  "/hotel-search",
  "/media",
  // The calculator endpoints the cloned pages call directly. Without these the
  // catch-all treats them as public paths, looks for a static file, and 404s.
  "/appointment/slots",
  "/get-cities",
  "/get-hotels-by-city",
  "/get-hotel-price",
  "/get-hotel-prices",
  // Served from the database by app/data/calculator/[file]/route.ts.
  "/data/calculator",
] as const;

export function isAppOwnedPath(pathname: string): boolean {
  return APP_OWNED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isNextInternalRequest(request: Request): boolean {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Next-Action") != null ||
    (request.headers.get("accept")?.includes("text/x-component") ?? false)
  );
}
