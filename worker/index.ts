/** Cloudflare Worker entry point for the Viraaya Weddings static clone. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  getCalculatorData,
  getIndiaCityIds,
  getIndiaCompareHotelIds,
  getIndiaHotelIds,
} from "./calculator-runtime";
import { handleLeadRequest, issueLeadCsrfToken, type LeadEmailEnv } from "./lead-email";
import { legacyLeadGetResponse, searchHotels, withDeprecatedLeadHeaders } from "./public-endpoints";
import { isMediaPath, serveMedia } from "./site/media";
import { loadCalculatorPrices } from "./site/calculator-prices";
import { enhancePublicHtml } from "./site/public-html";
import { CONSULTATION_SLOTS, publicRedirectTarget } from "./site/public-routes";
import { buildSitemapXml } from "./site/sitemap";
import { loadSiteSettings } from "./site/settings";
import { loadHeroSlides } from "./site/hero";
import { injectManagedContent, isHtmlResponse, needsInjection } from "./site/inject";
import {
  BLOG_LISTING_PATHS,
  BLOG_SHELL_PATH,
  blogSlugFromPath,
  blogTaxonomyFromPath,
  loadPublishedPosts,
  postsForTaxonomy,
} from "./site/blog";
import { HOTEL_SHELL_PATH, hotelPathFrom, loadHotels } from "./site/hotel";
import { cityFromListingPath, venuesForCity } from "./site/venue-listing";
import { resolvePage } from "./site/resolve-page";
import { getDb } from "./db/client";
import { getSessionUser } from "./admin/session";
import { loadCityPage, templateResponse } from "./site/template";
import { loadLabels } from "./site/labels";

interface Env extends LeadEmailEnv {
  ASSETS?: Fetcher;
  DB?: D1Database;
  MEDIA?: R2Bucket;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const ONE_YEAR = 31536000;
const STATIC_ASSET_EXTENSIONS = new Set([
  "avif",
  "css",
  "eot",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "js",
  "json",
  "png",
  "svg",
  "ttf",
  "webp",
  "woff",
  "woff2",
]);
const BLOCKED_PUBLIC_DATA_PATHS = new Set([
  "/data/calculator/calculator-data.json",
  "/data/calculator/availability-data.json",
]);
const SECURITY_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self'",
    "media-src 'self'",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
    "upgrade-insecure-requests",
  ].join("; "),
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), midi=(), picture-in-picture=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "x-permitted-cross-domain-policies": "none",
  "x-xss-protection": "0",
};
const FALLBACK_EXECUTION_CONTEXT: ExecutionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(
    request: Request,
    env: Env = {} as Env,
    ctx: ExecutionContext = FALLBACK_EXECUTION_CONTEXT,
  ): Promise<Response> {
    const url = new URL(request.url);
    const localJsonHeaders = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    };

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/wedding-consultation") {
      url.pathname = "/wedding-consultation/";
      return withSecurityHeaders(Response.redirect(url, 308), url);
    }

    const redirectTarget = publicRedirectTarget(url.pathname);
    if ((request.method === "GET" || request.method === "HEAD") && redirectTarget) {
      return withSecurityHeaders(Response.redirect(new URL(redirectTarget, url.origin), 301), url);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => {
          const target = new URL(path, request.url);
          // Images uploaded through the admin panel live in R2, not the asset
          // store, so they would otherwise be unreachable to the optimiser.
          if (isMediaPath(target.pathname)) return serveMedia(env, target.pathname, "GET");
          if (!env.ASSETS) return fetch(target);
          return env.ASSETS.fetch(new Request(target));
        },
        transformImage: async (body, { width, format, quality }) => {
          if (!env.IMAGES) {
            return new Response(body, {
              headers: {
                "content-type": `image/${format === "jpeg" ? "jpeg" : format}`,
              },
            });
          }

          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(imageResponse, url);
    }

    if ((request.method === "GET" || request.method === "HEAD") && isMediaPath(url.pathname)) {
      return withSecurityHeaders(await serveMedia(env, url.pathname, request.method), url);
    }

    // The admin panel is app-router rendered and must never be cached or
    // indexed. Its own static files (favicon) still come from ASSETS below.
    if (isAdminPath(url.pathname) && !isStaticAssetPath(url.pathname)) {
      const adminResponse = await handler.fetch(request, env, ctx);
      return withAdminHeaders(adminResponse, url);
    }

    const localResponse = await getLocalEndpointResponse(request, env, url, localJsonHeaders);
    if (localResponse) return withSecurityHeaders(localResponse, url);

    if (request.method === "GET" || request.method === "HEAD") {
      // Managed pages are built from the database: shell and content both come
      // from D1, and no file in site-public is consulted. Anything the database
      // does not own falls through to the static asset handling below.
      const fromDatabase = await serveFromDatabase(env, url, request);
      if (fromDatabase) return fromDatabase;

      if (!env.ASSETS) {
        const nodeStaticResponse = await getNodeStaticResponse(request, url);
        if (nodeStaticResponse) return serveManagedPage(nodeStaticResponse, url, env);

        if (!url.pathname.includes(".")) {
          const indexPath = url.pathname.endsWith("/")
            ? `${url.pathname}index.html`
            : `${url.pathname}/index.html`;
          const indexUrl = new URL(indexPath, url.origin);
          const indexResponse = await handler.fetch(new Request(indexUrl, request), env, ctx);
          if (indexResponse.status !== 404) return serveManagedPage(indexResponse, indexUrl, env);
        }

        const response = await handler.fetch(request, env, ctx);
        return serveManagedPage(response, url, env);
      }

      const directAsset = await env.ASSETS.fetch(request);
      if (directAsset.status !== 404) return serveManagedPage(directAsset, url, env);

      if (!url.pathname.includes(".")) {
        const indexPath = url.pathname.endsWith("/")
          ? `${url.pathname}index.html`
          : `${url.pathname}/index.html`;
        const indexUrl = new URL(indexPath, url.origin);
        const indexAsset = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (indexAsset.status !== 404) return serveManagedPage(indexAsset, indexUrl, env);
      }

      // Posts and venues added in the admin panel have no file of their own,
      // so they are rendered into the shell of an existing page.
      const shellResponse = await serveBlogFromShell(request, env, url);
      if (shellResponse) return shellResponse;

      const venueResponse = await serveHotelFromShell(request, env, url);
      if (venueResponse) return venueResponse;

      const notFound = await serveCustom404(env, request, url);
      if (notFound) return notFound;
    }

    const response = await handler.fetch(request, env, ctx);
    if ((request.method === "GET" || request.method === "HEAD") && response.status === 404) {
      const notFound = await serveCustom404(env, request, url);
      if (notFound) return notFound;
    }
    return request.method === "GET" || request.method === "HEAD"
      ? serveManagedPage(response, url, env)
      : withSecurityHeaders(response, url);
  },
};

async function getLocalEndpointResponse(
  request: Request,
  env: Env,
  url: URL,
  headers: HeadersInit,
): Promise<Response | null> {
  if (BLOCKED_PUBLIC_DATA_PATHS.has(url.pathname)) {
    return Response.json(
      {
        error: "Not found",
        hint: "Use /data/calculator/cities.json, /data/calculator/hotels-by-city.json, or /api/calculator/availability-data instead.",
      },
      {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }

  if (url.pathname === "/data/calculator/cities.json") {
    const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
    const cities = data.cities.filter((city) => indiaCityIds.has(String(city.id)));
    return Response.json(cities, { headers });
  }

  if (url.pathname === "/data/calculator/currencies.json") {
    const data = await getCalculatorData();
    return Response.json(data.currencies.filter((currency) => currency.code === "INR"), { headers });
  }

  if (url.pathname === "/data/calculator/hotels-by-city.json") {
    const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
    const hotelsByCity = Object.fromEntries(
      Object.entries(data.hotelsByCity)
        .filter(([cityId]) => indiaCityIds.has(String(cityId)))
        .map(([cityId, hotels]) => [
          cityId,
          hotels.map((hotel) => ({
            id: hotel.id,
            name: hotel.name,
            hotel_name: hotel.hotel_name || hotel.name,
            total_rooms: hotel.total_rooms,
          })),
        ]),
    );
    return Response.json(hotelsByCity, { headers });
  }

  if (url.pathname === "/data/calculator/hotels.json") {
    const data = await getCalculatorData();
    const hotels = Object.values(data.hotelsByCity)
      .flat()
      .map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        hotel_name: hotel.hotel_name || hotel.name,
        total_rooms: hotel.total_rooms,
      }));
    return Response.json(hotels, { headers });
  }

  if (url.pathname === "/data/calculator/prices.json") {
    const prices = await loadCalculatorPrices(env);
    return Response.json(prices, { headers });
  }

  if (url.pathname === "/api/lead/csrf" && request.method === "GET") {
    const issued = issueLeadCsrfToken(url.protocol === "https:");
    return Response.json(
      { token: issued.token },
      {
        headers: {
          ...headers,
          "cache-control": "no-store",
          "set-cookie": issued.cookie,
        },
      },
    );
  }

  if (url.pathname === "/sitemap.xml" && (request.method === "GET" || request.method === "HEAD")) {
    const xml = await buildSitemapXml(url.origin, env);
    return new Response(request.method === "HEAD" ? null : xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  if (url.pathname === "/api/lead") {
    return handleLeadRequest(request, env, url);
  }

  if (url.pathname === "/api/currencies") {
    const data = await getCalculatorData();
    return Response.json(data.currencies.filter((currency) => currency.code === "INR"), { headers });
  }

  if (url.pathname === "/api/currencies/select" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { currency?: unknown; code?: unknown };
    const currency = String(body.currency || body.code || "INR")
      .trim()
      .toUpperCase()
      .slice(0, 8);
    const secure = url.protocol === "https:";
    return Response.json(
      { ok: true, currency },
      {
        headers: {
          ...headers,
          "cache-control": "no-store",
          "set-cookie": `selected_currency=${currency}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`,
        },
      },
    );
  }

  if (url.pathname.startsWith("/hotel-search")) {
    return searchHotels(request);
  }

  if (url.pathname === "/storage") {
    return new Response("", {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  if (url.pathname === "/get-cities") {
    if (!isSameOriginBrowserRequest(request, url)) return blockedDataResponse(headers);
    const query = (url.searchParams.get("search") || "").trim().toLowerCase();
    const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
    const cities = data.cities
      .filter((city) => indiaCityIds.has(String(city.id)))
      .filter((city) => city.name.toLowerCase().includes(query));

    return Response.json(cities, { headers });
  }

  if (url.pathname === "/api/calculator/availability-data") {
    if (!isSameOriginBrowserRequest(request, url)) return blockedDataResponse(headers);
    return Response.json(await getAvailabilityData(), { headers });
  }

  if (url.pathname === "/get-hotels-by-city") {
    if (!isSameOriginBrowserRequest(request, url)) return blockedDataResponse(headers);
    const cityId = url.searchParams.get("city") || "";
    return Response.json(await getCompareHotelsForCity(cityId), { headers });
  }

  if (url.pathname.startsWith("/get-hotels-by-city/")) {
    if (!isSameOriginBrowserRequest(request, url)) return blockedDataResponse(headers);
    const cityId = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] || "");
    return Response.json(await getHotelsForCity(cityId), { headers });
  }

  if (url.pathname.startsWith("/get-hotel-price/")) {
    if (!isSameOriginBrowserRequest(request, url)) return blockedDataResponse(headers);
    const [prices, indiaHotelIds, indiaCompareHotelIds] = await Promise.all([
      loadCalculatorPrices(env),
      getIndiaHotelIds(),
      getIndiaCompareHotelIds(),
    ]);
    const [, hotelId = "", month = ""] = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    const hotelPrices = (indiaHotelIds.has(String(hotelId)) || indiaCompareHotelIds.has(String(hotelId)))
      ? prices[hotelId as keyof typeof prices]
      : undefined;
    const price = normalizePrice(hotelPrices?.[month as keyof typeof hotelPrices]);
    return Response.json(price, { headers });
  }

  if (url.pathname === "/get-hotel-prices") {
    if (!isSameOriginBrowserRequest(request, url)) return blockedDataResponse(headers);
    const prices = await loadCalculatorPrices(env);
    const payload = request.method === "POST" ? await readHotelPricesPayload(request) : { hotelIds: [], checkin: "" };
    const hotelIds = payload.hotelIds;
    const checkin = payload.checkin;
    const month = getMonthName(checkin) || "January";
    const hotels = (
      await Promise.all(hotelIds.map((hotelId) => getComparableHotel(hotelId, month, prices)))
    ).filter((hotel) => hotel !== null);

    return Response.json(hotels, { headers });
  }

  if (url.pathname === "/appointment/slots") {
    return Response.json([...CONSULTATION_SLOTS], { headers });
  }

  if (
    url.pathname === "/contact/save" ||
    url.pathname === "/get_in_touch/store" ||
    url.pathname === "/blog-form-submit"
  ) {
    if (request.method === "GET" || request.method === "HEAD") return legacyLeadGetResponse();
    const leadResponse = await handleLeadRequest(request, env, url);
    return withDeprecatedLeadHeaders(leadResponse);
  }

  return null;
}

function withCacheHeaders(response: Response, url: URL, cacheControlOverride?: string) {
  const headers = new Headers(response.headers);

  if (cacheControlOverride) {
    headers.delete("cache-control");
    headers.set("cache-control", cacheControlOverride);
  } else if (isStaticAssetPath(url.pathname)) {
    headers.delete("cache-control");
    headers.set("cache-control", `public, max-age=${ONE_YEAR}, immutable`);
  } else if (isHtmlPath(url.pathname)) {
    headers.delete("cache-control");
    headers.set("cache-control", "public, max-age=300, stale-while-revalidate=86400");
  }

  return withSecurityHeaders(new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }), url);
}

/**
 * Pages whose content an admin can change are cached far more briefly than the
 * untouched static HTML, so an edit shows up quickly.
 */
const MANAGED_CACHE_CONTROL = "public, max-age=30";

/**
 * Applies admin-managed content to an HTML response. Pages fall through
 * untouched — and keep their original cache policy — until something has
 * actually been customised.
 */
/**
 * Renders a database-only post using a published article's markup as the shell.
 * Returns null when the path is not a published post, letting the normal 404
 * handling take over.
 */
async function serveBlogFromShell(request: Request, env: Env, url: URL): Promise<Response | null> {
  const slug = blogSlugFromPath(url.pathname);
  if (!slug || !env.ASSETS) return null;

  const posts = await loadPublishedPosts(env);
  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) return null;

  const shellUrl = new URL(BLOG_SHELL_PATH, url.origin);
  const shell = await env.ASSETS.fetch(new Request(shellUrl, request));
  // Anything other than a straight 200 (a redirect, an error) is not usable as
  // a template and must not be forwarded to the visitor.
  if (shell.status !== 200) return null;

  const input = {
    settings: await loadSiteSettings(env),
    heroSlides: [],
    blogPosts: posts,
    taxonomyPosts: [],
    blogPost: post,
    hotel: null,
    venues: [],
    cityVenues: [],
    cityPage: null,
    labels: await loadLabels(env),
  };

  return withCacheHeaders(
    injectManagedContent(shell, `/blogs/${slug}`, input, url.origin),
    url,
    MANAGED_CACHE_CONTROL,
  );
}

/**
 * Renders a database-only venue using a published venue's markup as the shell.
 * Returns null when the path is not a published venue, letting the normal 404
 * handling take over.
 */
async function serveHotelFromShell(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = hotelPathFrom(url.pathname);
  if (!path || !env.ASSETS) return null;

  const venues = await loadHotels(env);
  const venue = venues.find((candidate) => candidate.city === path.city && candidate.slug === path.slug);
  if (!venue) return null;

  const shellUrl = new URL(HOTEL_SHELL_PATH, url.origin);
  const shell = await env.ASSETS.fetch(new Request(shellUrl, request));
  // Anything other than a straight 200 is not usable as a template.
  if (shell.status !== 200) return null;

  const input = {
    settings: await loadSiteSettings(env),
    heroSlides: [],
    blogPosts: [],
    taxonomyPosts: [],
    blogPost: null,
    hotel: venue,
    venues,
    cityVenues: [],
    cityPage: await loadCityPage(env, path.city),
    labels: await loadLabels(env),
  };

  return withCacheHeaders(
    injectManagedContent(shell, `/destination-wedding/${path.city}/${path.slug}`, input, url.origin),
    url,
    MANAGED_CACHE_CONTROL,
  );
}

/**
 * Renders a page entirely from the database. Returns null when the path is not
 * database-owned, or when its shell is missing, so the caller can fall back to
 * the original file rather than lose the page.
 */
/**
 * True when this request may see unpublished content.
 *
 * Gated on a real admin session rather than on a token in the URL: a draft is
 * an unfinished public page, and the people who need to see one are exactly
 * the people who can already sign in.
 */
async function isPreviewRequest(env: Env, url: URL, request: Request): Promise<boolean> {
  if (url.searchParams.get("preview") !== "1") return false;
  const db = await getDb(env);
  if (!db) return false;
  return Boolean(await getSessionUser(db, request));
}

async function serveFromDatabase(env: Env, url: URL, request: Request): Promise<Response | null> {
  const preview = await isPreviewRequest(env, url, request);
  const resolved = await resolvePage(env, url.pathname, { preview });
  if (!resolved) return null;

  const response = injectManagedContent(
    templateResponse(resolved.html),
    resolved.pathname,
    resolved.input,
    url.origin,
  );

  // A preview may contain unpublished content, so it is never cached and never
  // indexed, whatever the page's normal headers would have been.
  if (preview) {
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store, no-cache, must-revalidate");
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    return withSecurityHeaders(new Response(response.body, { status: response.status, headers }), url);
  }

  return withCacheHeaders(response, url, MANAGED_CACHE_CONTROL);
}

async function serveManagedPage(response: Response, url: URL, env: Env): Promise<Response> {
  if (!isHtmlResponse(response)) return withCacheHeaders(response, url);

  const input = await loadManagedContent(env, url.pathname);
  const applyChanges = needsInjection(url.pathname, input);
  const rewritten = injectManagedContent(response, url.pathname, input, url.origin, applyChanges);
  const enhanced = await enhancePublicHtml(rewritten, url.pathname);
  return withCacheHeaders(enhanced, url, applyChanges ? MANAGED_CACHE_CONTROL : undefined);
}

async function serveCustom404(env: Env, request: Request, url: URL): Promise<Response | null> {
  if (url.pathname.includes(".")) return null;

  const fetch404 = async (target: URL): Promise<Response | null> => {
    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(new Request(target, request));
      if (asset.status === 200) return asset;
    }
    return getNodeStaticResponse(request, target);
  };

  const target = new URL("/404.html", url.origin);
  const page = await fetch404(target);
  if (!page) return null;

  const input = await loadManagedContent(env, url.pathname);
  const rewritten = injectManagedContent(page, url.pathname, input, url.origin, false);
  const enhanced = await enhancePublicHtml(rewritten, url.pathname);
  return withCacheHeaders(
    new Response(enhanced.body, { status: 404, headers: enhanced.headers }),
    url,
  );
}

/**
 * Only the data a given page can actually use is fetched: hero slides are
 * homepage-only and posts are blog-only, so most pages cost a single lookup.
 */
async function loadManagedContent(env: Env, pathname: string) {
  const wantsHero = pathname === "/" || pathname === "/index.html";
  const slug = blogSlugFromPath(pathname);
  const taxonomy = blogTaxonomyFromPath(pathname);
  const wantsPosts = Boolean(slug) || Boolean(taxonomy) || BLOG_LISTING_PATHS.has(pathname);
  const hotelPath = hotelPathFrom(pathname);
  const listingCity = cityFromListingPath(pathname);

  const [settings, heroSlides, blogPosts, venues] = await Promise.all([
    loadSiteSettings(env),
    wantsHero ? loadHeroSlides(env) : Promise.resolve([]),
    wantsPosts ? loadPublishedPosts(env) : Promise.resolve([]),
    hotelPath || listingCity ? loadHotels(env) : Promise.resolve([]),
  ]);

  return {
    settings,
    heroSlides,
    blogPosts,
    blogPost: slug ? blogPosts.find((post) => post.slug === slug) ?? null : null,
    taxonomyPosts: taxonomy ? await postsForTaxonomy(env, taxonomy, blogPosts) : [],
    hotel: hotelPath
      ? venues.find((venue) => venue.city === hotelPath.city && venue.slug === hotelPath.slug) ?? null
      : null,
    venues,
    cityVenues: listingCity ? await venuesForCity(env, listingCity, venues) : [],
    cityPage: listingCity
      ? await loadCityPage(env, listingCity)
      : hotelPath
        ? await loadCityPage(env, hotelPath.city)
        : null,
    labels: await loadLabels(env),
  };
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function withAdminHeaders(response: Response, url: URL) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");

  return withSecurityHeaders(new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }), url);
}

function withSecurityHeaders(response: Response, url: URL) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  if (url.protocol === "https:") {
    headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isStaticAssetPath(pathname: string) {
  const extension = pathname.split(".").pop()?.toLowerCase() || "";
  return STATIC_ASSET_EXTENSIONS.has(extension) && extension !== "html";
}

function isHtmlPath(pathname: string) {
  return pathname.endsWith(".html") || !pathname.includes(".");
}

async function getNodeStaticResponse(request: Request, url: URL): Promise<Response | null> {
  const nodeProcess = globalThis.process;
  if (!nodeProcess?.versions?.node) return null;

  const [{ readFile }, { resolve, sep }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const publicRoot = resolve(nodeProcess.cwd(), "dist", "client");
  const requestedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidates = requestedPath.includes(".")
    ? [requestedPath]
    : requestedPath
      ? [
        `${requestedPath.replace(/\/$/, "")}/index.html`,
        `${requestedPath.replace(/\/$/, "")}.html`,
      ]
      : ["index.html"];

  for (const candidate of candidates) {
    const filePath = resolve(publicRoot, candidate || "index.html");
    if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) continue;

    try {
      const body = await readFile(filePath);
      return new Response(request.method === "HEAD" ? null : body, {
        headers: {
          "content-type": contentTypeFor(filePath),
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return null;
}

function contentTypeFor(filePath: string) {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    css: "text/css; charset=utf-8",
    gif: "image/gif",
    html: "text/html; charset=utf-8",
    ico: "image/x-icon",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    png: "image/png",
    svg: "image/svg+xml",
    ttf: "font/ttf",
    webp: "image/webp",
    woff: "font/woff",
    woff2: "font/woff2",
  };

  return types[extension || ""] || "application/octet-stream";
}

async function getHotelsForCity(cityId: string) {
  const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
  if (!indiaCityIds.has(String(cityId))) return [];
  const hotels = data.hotelsByCity[cityId as keyof typeof data.hotelsByCity] || [];
  return hotels.map((hotel) => ({
    ...hotel,
    hotel_name: hotel.name,
  }));
}

async function getCompareHotelsForCity(cityId: string) {
  const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
  if (!indiaCityIds.has(String(cityId))) return [];
  const hotels = data.compareHotelsByCity[cityId as keyof typeof data.compareHotelsByCity]
    || data.hotelsByCity[cityId as keyof typeof data.hotelsByCity]
    || [];

  return hotels.map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    hotel_name: hotel.hotel_name || hotel.name,
    total_rooms: hotel.total_rooms,
  }));
}

async function getAvailabilityData() {
  const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
  const cities = data.cities
    .filter((city) => indiaCityIds.has(String(city.id)))
    .map((city) => ({
      id: city.id,
      name: city.name,
    }));

  const hotelsByCity = Object.fromEntries(
    cities.map((city) => [
      String(city.id),
      (data.hotelsByCity[String(city.id) as keyof typeof data.hotelsByCity] || []).map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
      })),
    ]),
  );

  return {
    generated_at: data.generated_at,
    cities,
    hotelsByCity,
  };
}

function isSameOriginBrowserRequest(request: Request, url: URL) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "none"].includes(secFetchSite)) return false;

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return false;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== url.origin) return false;
    } catch {
      return false;
    }
  }

  return Boolean(origin || referer || secFetchSite === "same-origin");
}

function blockedDataResponse(headers: HeadersInit) {
  return Response.json({ error: "Not found" }, {
    status: 404,
    headers: {
      ...headers,
      "cache-control": "no-store",
    },
  });
}

function normalizePrice(
  price?: {
    room_price: string;
    lunch_price: string;
    hitea_price: string;
    dinner_price: string;
  },
) {
  const normalized = price || {
      room_price: "0.00",
      lunch_price: "0.00",
      hitea_price: "0.00",
      dinner_price: "0.00",
    };

  return {
    ...normalized,
    hi_tea_price: normalized.hitea_price,
  };
}

function getMonthName(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "long" });
}

async function readHotelPricesPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      hotel_ids?: unknown;
      hotelIds?: unknown;
      checkin?: unknown;
      month?: unknown;
    };
    const rawHotelIds = body.hotel_ids ?? body.hotelIds ?? [];
    const hotelIds = Array.isArray(rawHotelIds) ? rawHotelIds.map(String) : [String(rawHotelIds)];
    return {
      hotelIds: hotelIds.filter(Boolean),
      checkin: typeof body.checkin === "string" ? body.checkin : "",
    };
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return { hotelIds: [], checkin: "" };

  return {
    hotelIds: formData
      .getAll("hotel_ids[]")
      .concat(formData.getAll("hotel_ids"))
      .map(String)
      .filter(Boolean),
    checkin: formData.get("checkin")?.toString() || "",
  };
}

async function getComparableHotel(
  hotelId: string,
  month: string,
  prices: Awaited<ReturnType<typeof getCalculatorData>>["prices"],
) {
  const [data, indiaCityIds] = await Promise.all([getCalculatorData(), getIndiaCityIds()]);
  for (const [cityId, hotels] of Object.entries(data.compareHotelsByCity)) {
    if (!indiaCityIds.has(String(cityId))) continue;
    const hotel = hotels.find((candidate) => String(candidate.id) === String(hotelId));
    if (!hotel) continue;

    const city = data.cities.find((candidate) => String(candidate.id) === cityId);
    const hotelPrices = prices[String(hotel.id) as keyof typeof prices];
    const price = normalizePrice(hotelPrices?.[month as keyof typeof hotelPrices]);

    return {
      id: hotel.id,
      hotel_name: hotel.hotel_name || hotel.name,
      total_rooms: hotel.total_rooms,
      prices: [
        {
          ...price,
          hotel: {
            city: {
              name: city?.name || "",
            },
          },
        },
      ],
    };
  }

  return null;
}

export default worker;
