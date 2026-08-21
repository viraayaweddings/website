/**
 * Serves admin-uploaded files from R2 at /media/<key>.
 */
import { isR2Configured, r2Get } from "../storage/r2";

const MEDIA_PREFIX = "/media/";
const ONE_YEAR = 31536000;

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

export async function serveMedia(_env: unknown, pathname: string, method: string): Promise<Response> {
  const notFound = new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

  const key = keyFromPath(pathname);
  if (!key || !isR2Configured()) return notFound;

  const object = await r2Get(key);
  if (!object?.body) return notFound;

  const headers = new Headers();
  headers.set("content-type", object.contentType);
  headers.set("cache-control", `public, max-age=${ONE_YEAR}, immutable`);
  if (object.etag) headers.set("etag", object.etag);
  if (object.size) headers.set("content-length", String(object.size));

  return new Response(method === "HEAD" ? null : object.body, { headers });
}
