import fs from "node:fs/promises";
import path from "node:path";

const sources: Record<string, { dir: string }> = {
  gcpimages: { dir: "gcpimages.theweddingcompany.com" },
  imageswedding: { dir: "imageswedding.theweddingcompany.com" },
  weddingimage: { dir: "weddingimage.betterhalf.ai" },
  storage: { dir: "storage.googleapis.com" },
  maps: { dir: "maps.gstatic.com" },
  webflowcdn: { dir: "cdn.prod.website-files.com" },
  webflowassets: { dir: "assets-global.website-files.com" }
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

const IMMUTABLE = "public, max-age=31536000, immutable";
const NOT_FOUND_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};
const FALLBACK_IMAGE_PATH = path.join(
  process.cwd(),
  "public",
  "twc-next",
  "static",
  "media",
  "NoVenueImageFound.c5374eba.webp"
);

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

function isImageRequest(pathParts: string[]) {
  return Boolean(safeMimeTypeForPath(pathParts)?.startsWith("image/"));
}

async function fallbackImageResponse() {
  const body = await fs.readFile(FALLBACK_IMAGE_PATH);
  return new Response(body, {
    headers: {
      "content-type": "image/webp",
      "cache-control": IMMUTABLE,
      "x-content-type-options": "nosniff"
    }
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ source: string; path: string[] }> }
) {
  const { source, path: pathParts } = await params;
  const entry = sources[source];
  if (!entry || !isSafePath(pathParts)) {
    return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
  }

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
      if (isImageRequest(pathParts)) return fallbackImageResponse();
    }
  }

  if (isImageRequest(pathParts)) return fallbackImageResponse();
  return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
}
