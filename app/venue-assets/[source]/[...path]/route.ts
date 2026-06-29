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
const assetRoots = ["twc-company-assets", "twc-venues-local"];
const fallbackImages = {
  default: ["twc-next", "static", "media", "hotel-taj.cca019c4.webp"],
  decor: ["twc-assets", "ideabook", "decor.webp"],
  photographer: ["twc-photographers", "cards", "11e42d27-2a7c-4b31-bdd7-f1c7014ff273.jpg"],
  map: ["brand", "favicon.png"]
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

function isImageRequest(pathParts: string[]) {
  return Boolean(safeMimeTypeForPath(pathParts)?.startsWith("image/"));
}

function fallbackImageParts(source: string, pathParts: string[]) {
  const requestPath = `${source}/${pathParts.join("/")}`.toLowerCase();
  if (source === "maps" || requestPath.includes("mapfiles/place_api/icons")) {
    return fallbackImages.map;
  }
  if (requestPath.includes("decor")) {
    return fallbackImages.decor;
  }
  if (requestPath.includes("photography") || requestPath.includes("photographer")) {
    return fallbackImages.photographer;
  }
  return fallbackImages.default;
}

async function fallbackImageResponse(source: string, pathParts: string[]) {
  const fallbackParts = fallbackImageParts(source, pathParts);
  const fallbackPath = path.join(process.cwd(), "public", ...fallbackParts);
  const body = await fs.readFile(fallbackPath);
  return new Response(body, {
    headers: {
      "content-type": safeMimeTypeForPath(fallbackParts) || "image/webp",
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

  for (const assetRoot of assetRoots) {
    const root = path.resolve(process.cwd(), "public", assetRoot, entry.dir);
    const file = path.resolve(root, ...pathParts);
    if (!file.startsWith(root + path.sep)) continue;

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
      // Try the next mirror root before falling back to a placeholder.
    }
  }

  if (isImageRequest(pathParts)) return fallbackImageResponse(source, pathParts);
  return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
}
