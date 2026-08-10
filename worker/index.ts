/** Cloudflare Worker entry point for the Viraaya Weddings static clone. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { calculatorData } from "./calculator-data";
import { handleLeadRequest, type LeadEmailEnv } from "./lead-email";

interface Env extends LeadEmailEnv {
  ASSETS?: Fetcher;
  DB?: D1Database;
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
  "permissions-policy": "accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), usb=()",
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

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => {
          if (!env.ASSETS) return fetch(new URL(path, request.url));
          return env.ASSETS.fetch(new Request(new URL(path, request.url)));
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

    const localResponse = await getLocalEndpointResponse(request, env, url, localJsonHeaders);
    if (localResponse) return withSecurityHeaders(localResponse, url);

    if (request.method === "GET" || request.method === "HEAD") {
      if (!env.ASSETS) {
        const nodeStaticResponse = await getNodeStaticResponse(request, url);
        if (nodeStaticResponse) return withCacheHeaders(nodeStaticResponse, url);

        if (!url.pathname.includes(".")) {
          const indexPath = url.pathname.endsWith("/")
            ? `${url.pathname}index.html`
            : `${url.pathname}/index.html`;
          const indexUrl = new URL(indexPath, url.origin);
          const indexResponse = await handler.fetch(new Request(indexUrl, request), env, ctx);
          if (indexResponse.status !== 404) return withCacheHeaders(indexResponse, indexUrl);
        }

        const response = await handler.fetch(request, env, ctx);
        return withCacheHeaders(response, url);
      }

      const directAsset = await env.ASSETS.fetch(request);
      if (directAsset.status !== 404) return withCacheHeaders(directAsset, url);

      if (!url.pathname.includes(".")) {
        const indexPath = url.pathname.endsWith("/")
          ? `${url.pathname}index.html`
          : `${url.pathname}/index.html`;
        const indexUrl = new URL(indexPath, url.origin);
        const indexAsset = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (indexAsset.status !== 404) return withCacheHeaders(indexAsset, indexUrl);
      }

    }

    const response = await handler.fetch(request, env, ctx);
    return request.method === "GET" || request.method === "HEAD"
      ? withCacheHeaders(response, url)
      : withSecurityHeaders(response, url);
  },
};

async function getLocalEndpointResponse(
  request: Request,
  env: Env,
  url: URL,
  headers: HeadersInit,
): Promise<Response | null> {
  if (url.pathname === "/api/lead") {
    return handleLeadRequest(request, env, url);
  }

  if (url.pathname === "/api/currencies") {
    return Response.json(calculatorData.currencies, { headers });
  }

  if (url.pathname === "/api/currencies/select") {
    return Response.json({ ok: true }, { headers });
  }

  if (url.pathname === "/storage") {
    return new Response("", {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  if (url.pathname.startsWith("/hotel-search")) {
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    if (!query) return Response.json([], { headers });

    const results = calculatorData.searchIndex
      .filter((hotel) => hotel.hotel_name.toLowerCase().includes(query))
      .sort((a, b) => a.hotel_name.localeCompare(b.hotel_name, "en", { sensitivity: "base" }))
      .slice(0, 8)
      .map((hotel) => ({
        id: hotel.id,
        hotel_name: hotel.hotel_name,
        city: null,
      }));

    return Response.json(results, { headers });
  }

  if (url.pathname === "/get-cities") {
    const query = (url.searchParams.get("search") || "").trim().toLowerCase();
    const cities = calculatorData.cities
      .filter((city) => city.name.toLowerCase().includes(query))
      .slice(0, 50);

    return Response.json(cities, { headers });
  }

  if (url.pathname === "/get-hotels-by-city") {
    const cityId = url.searchParams.get("city") || "";
    return Response.json(getHotelsForCity(cityId), { headers });
  }

  if (url.pathname.startsWith("/get-hotels-by-city/")) {
    const cityId = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] || "");
    return Response.json(getHotelsForCity(cityId), { headers });
  }

  if (url.pathname.startsWith("/get-hotel-price/")) {
    const [, hotelId = "", month = ""] = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    const hotelPrices = calculatorData.prices[hotelId as keyof typeof calculatorData.prices];
    const price = normalizePrice(hotelPrices?.[month as keyof typeof hotelPrices]);
    return Response.json(price, { headers });
  }

  if (url.pathname === "/get-hotel-prices") {
    const formData = request.method === "POST" ? await request.formData() : null;
    const hotelIds = formData
      ? formData.getAll("hotel_ids[]").concat(formData.getAll("hotel_ids")).map(String)
      : [];
    const checkin = formData?.get("checkin")?.toString() || "";
    const month = getMonthName(checkin) || "January";
    const hotels = hotelIds
      .map((hotelId) => getComparableHotel(hotelId, month))
      .filter((hotel) => hotel !== null);

    return Response.json(hotels, { headers });
  }

  if (url.pathname === "/appointment/slots") {
    return Response.json(["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"], { headers });
  }

  if (url.pathname === "/appointment/pay") {
    return handleLeadRequest(request, env, url, "appointment");
  }

  if (url.pathname === "/appointment/verify") {
    return Response.json({ status: "success" }, { headers });
  }

  if (
    url.pathname === "/contact/save" ||
    url.pathname === "/get_in_touch/store" ||
    url.pathname === "/blog-form-submit"
  ) {
    return handleLeadRequest(request, env, url);
  }

  return null;
}

function withCacheHeaders(response: Response, url: URL) {
  const headers = new Headers(response.headers);

  if (isStaticAssetPath(url.pathname)) {
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
    : [
        `${requestedPath.replace(/\/$/, "")}/index.html`,
        `${requestedPath.replace(/\/$/, "")}.html`,
      ];

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

function getHotelsForCity(cityId: string) {
  const hotels = calculatorData.hotelsByCity[cityId as keyof typeof calculatorData.hotelsByCity] || [];
  return hotels.map((hotel) => ({
    ...hotel,
    hotel_name: hotel.name,
  }));
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

function getComparableHotel(hotelId: string, month: string) {
  for (const [cityId, hotels] of Object.entries(calculatorData.hotelsByCity)) {
    const hotel = hotels.find((candidate) => String(candidate.id) === String(hotelId));
    if (!hotel) continue;

    const city = calculatorData.cities.find((candidate) => String(candidate.id) === cityId);
    const prices = calculatorData.prices[String(hotel.id) as keyof typeof calculatorData.prices];
    const price = normalizePrice(prices?.[month as keyof typeof prices]);

    return {
      id: hotel.id,
      hotel_name: hotel.name,
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
