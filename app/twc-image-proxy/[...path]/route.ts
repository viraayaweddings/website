import fs from "node:fs/promises";
import path from "node:path";

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
  "Mandap.d8d5d35e.webp"
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

async function fallbackImageResponse() {
  const body = await fs.readFile(FALLBACK_IMAGE_PATH);
  return new Response(body, {
    headers: {
      "cache-control": IMMUTABLE,
      "content-type": "image/webp",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params;
  if (!isSafePath(pathParts)) return new Response("Not found", { status: 404 });

  const root = path.resolve(
    process.cwd(),
    "public",
    "twc-venues-local",
    "imageswedding.theweddingcompany.com"
  );
  const file = path.resolve(root, ...pathParts);
  const ext = path.extname(pathParts[pathParts.length - 1] ?? "").toLowerCase();
  const contentType = mimeTypes[ext];

  if (file.startsWith(root + path.sep)) {
    try {
      const body = await fs.readFile(file);
      return new Response(body, {
        headers: {
          "cache-control": IMMUTABLE,
          "content-type": contentType || "application/octet-stream",
          "x-content-type-options": "nosniff"
        }
      });
    } catch {
      if (contentType?.startsWith("image/")) return fallbackImageResponse();
    }
  }

  if (contentType?.startsWith("image/")) return fallbackImageResponse();
  return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
}
