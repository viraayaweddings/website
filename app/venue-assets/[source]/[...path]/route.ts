import fs from "node:fs/promises";
import path from "node:path";

// Venue media host map. `dir` is the locally-vendored folder (used in dev);
// `host` is the upstream CDN used as a fallback in production, where the 9.7GB
// of local images are gitignored and therefore not deployed.
const sources: Record<string, { dir: string; host: string }> = {
  gcpimages: { dir: "gcpimages.theweddingcompany.com", host: "https://gcpimages.theweddingcompany.com" },
  imageswedding: { dir: "imageswedding.theweddingcompany.com", host: "https://imageswedding.theweddingcompany.com" },
  weddingimage: { dir: "weddingimage.betterhalf.ai", host: "https://weddingimage.betterhalf.ai" },
  maps: { dir: "maps.gstatic.com", host: "https://maps.gstatic.com" }
};

const mimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp"
};

const allowedContentTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "video/mp4",
  "video/webm"
]);

const IMMUTABLE = "public, max-age=31536000, immutable";
const NOT_FOUND_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};
const UPSTREAM_HEADERS = {
  accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  referer: "https://www.theweddingcompany.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
};

function isSafePath(pathParts: string[]) {
  try {
    return pathParts.length > 0 && pathParts.every((part) => {
      const decoded = decodeURIComponent(part);
      return (
        decoded.length > 0 &&
        decoded !== "." &&
        decoded !== ".." &&
        !decoded.includes("/") &&
        !decoded.includes("\\") &&
        !decoded.includes("\0")
      );
    });
  } catch {
    return false;
  }
}

function safeMimeTypeForPath(pathParts: string[]) {
  return mimeTypes[path.extname(pathParts[pathParts.length - 1] ?? "").toLowerCase()];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ source: string; path: string[] }> }
) {
  const { source, path: pathParts } = await params;
  const entry = sources[source];
  if (!entry || !isSafePath(pathParts)) {
    return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
  }

  // 1) Serve the locally-vendored file when present in dev.
  if (process.env.NODE_ENV !== "production") {
    const root = path.resolve(process.cwd(), "public", "twc-venues-local", entry.dir);
    const file = path.resolve(root, ...pathParts);
    if (file.startsWith(root + path.sep)) {
      try {
        const body = await fs.readFile(file);
        return new Response(body, {
          headers: {
            "content-type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
            "cache-control": IMMUTABLE,
            "x-content-type-options": "nosniff"
          }
        });
      } catch {
        /* fall through to CDN */
      }
    }
  }

  // 2) Fall back to the upstream CDN.
  const target = entry.host + "/" + pathParts.map(encodeURIComponent).join("/") + new URL(request.url).search;
  try {
    const upstream = await fetch(target, { headers: UPSTREAM_HEADERS });
    const upstreamContentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    const contentType = upstreamContentType && allowedContentTypes.has(upstreamContentType)
      ? upstreamContentType
      : upstreamContentType === "application/octet-stream"
        ? safeMimeTypeForPath(pathParts)
        : undefined;

    if (!upstream.ok || !contentType || !allowedContentTypes.has(contentType)) {
      return new Response("Not found", {
        status: upstream.ok ? 404 : upstream.status,
        headers: NOT_FOUND_HEADERS
      });
    }
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      headers: {
        "content-type": contentType,
        "cache-control": IMMUTABLE,
        "x-content-type-options": "nosniff"
      }
    });
  } catch {
    return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
  }
}
