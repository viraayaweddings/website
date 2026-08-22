/**
 * Serves admin-uploaded files from R2 at /media/<key>.
 */
import imageMigrationMap from "../../scripts/image-migration-map.json";
import { isR2Configured, r2Get } from "../storage/r2";
import { readStaticFile } from "./serve-static";

const MEDIA_PREFIX = "/media/";
const ONE_YEAR = 31536000;
const legacyFallbackPaths = new Map(
  Object.entries(imageMigrationMap as Record<string, string>)
    .filter(([, mediaPath]) => mediaPath.startsWith(MEDIA_PREFIX))
    .map(([publicPath, mediaPath]) => [mediaPath.slice(MEDIA_PREFIX.length), publicPath]),
);

export function isMediaPath(pathname: string): boolean {
  return pathname.startsWith(MEDIA_PREFIX);
}

function keyFromPath(pathname: string): string {
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(MEDIA_PREFIX.length));
  } catch {
    return "";
  }

  if (!key || key.includes("..") || key.startsWith("/")) return "";
  return key;
}

function mediaHeaders(contentType: string, size = 0, etag = ""): Headers {
  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("cache-control", `public, max-age=${ONE_YEAR}, immutable`);
  // An SVG opened directly is a document, and a document on this origin can run
  // script and read the session cookie. Inside <img> it never executes, which is
  // how every one of them is used, so locking the direct view costs nothing.
  // Uploads still refuse SVG outright; this covers the site's own files.
  headers.set("x-content-type-options", "nosniff");
  if (contentType === "image/svg+xml") {
    headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }
  if (etag) headers.set("etag", etag);
  if (size) headers.set("content-length", String(size));
  return headers;
}

async function fetchLegacyFallback(publicPath: string, method: string, requestUrl: string): Promise<Response | null> {
  const headers: Record<string, string> = {};
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  const response = await fetch(new URL(publicPath, requestUrl), {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (!response?.ok) return null;

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const size = Number(response.headers.get("content-length") || 0);
  return new Response(method === "HEAD" ? null : response.body, {
    headers: mediaHeaders(contentType, size, response.headers.get("etag") || ""),
  });
}

async function legacyFallback(key: string, method: string, requestUrl = ""): Promise<Response | null> {
  const publicPath = legacyFallbackPaths.get(key);
  if (!publicPath) return null;

  if (process.env.VERCEL && requestUrl) {
    const fetched = await fetchLegacyFallback(publicPath, method, requestUrl);
    if (fetched) return fetched;
  }

  const file = await readStaticFile(publicPath);
  if (!file) return null;

  return new Response(method === "HEAD" ? null : new Uint8Array(file.body), {
    headers: mediaHeaders(file.contentType, file.body.byteLength),
  });
}

export async function serveMedia(
  _env: unknown,
  pathname: string,
  method: string,
  requestUrl = "",
): Promise<Response> {
  const notFound = new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

  const key = keyFromPath(pathname);
  if (!key) return notFound;

  const object = isR2Configured() ? await r2Get(key) : null;
  if (!object?.body) return (await legacyFallback(key, method, requestUrl)) ?? notFound;

  return new Response(method === "HEAD" ? null : object.body, {
    headers: mediaHeaders(object.contentType, object.size, object.etag),
  });
}
