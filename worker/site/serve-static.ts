/**
 * Serves files from site-public on Vercel / Node (no Cloudflare ASSETS binding).
 */
import { access, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

const BLOCKED_PUBLIC_DATA_PATHS = new Set([
  "/data/calculator/calculator-data.json",
  "/data/calculator/availability-data.json",
]);

const CONTENT_TYPES: Record<string, string> = {
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
  xml: "application/xml; charset=utf-8",
};

function contentTypeFor(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase() || "";
  return CONTENT_TYPES[extension] || "application/octet-stream";
}

function publicRoots(): string[] {
  const cwd = process.cwd();
  return [
    resolve(cwd, "site-public"),
    resolve(cwd, ".output", "public"),
    resolve(cwd, "dist", "client"),
  ];
}

function candidatePaths(pathname: string): string[] {
  const requestedPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (requestedPath.includes(".")) return [requestedPath];
  if (!requestedPath) return ["index.html"];
  const trimmed = requestedPath.replace(/\/$/, "");
  return [`${trimmed}/index.html`, `${trimmed}.html`];
}

export function isBlockedPublicPath(pathname: string): boolean {
  return BLOCKED_PUBLIC_DATA_PATHS.has(pathname);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readStaticFile(
  pathname: string,
): Promise<{ body: Buffer; contentType: string; filePath: string } | null> {
  if (isBlockedPublicPath(pathname)) return null;

  for (const root of publicRoots()) {
    for (const candidate of candidatePaths(pathname)) {
      const filePath = resolve(root, candidate || "index.html");
      if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) continue;
      if (!(await fileExists(filePath))) continue;

      const body = await readFile(filePath);
      return { body, contentType: contentTypeFor(filePath), filePath };
    }
  }

  return null;
}

export function cacheControlFor(contentType: string): string {
  if (contentType.includes("text/html")) return "public, max-age=0, must-revalidate";
  return "public, max-age=31536000, immutable";
}
