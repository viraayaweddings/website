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

const IMMUTABLE = "public, max-age=31536000, immutable";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ source: string; path: string[] }> }
) {
  const { source, path: pathParts } = await params;
  const entry = sources[source];
  if (!entry) return new Response("Not found", { status: 404 });

  // 1) Serve the locally-vendored file when present (dev / no live dependency).
  const root = path.resolve(process.cwd(), "public", "twc-venues-local", entry.dir);
  const file = path.resolve(root, ...pathParts);
  if (file.startsWith(root + path.sep)) {
    try {
      const body = await fs.readFile(file);
      return new Response(body, {
        headers: {
          "content-type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
          "cache-control": IMMUTABLE
        }
      });
    } catch {
      /* fall through to CDN */
    }
  }

  // 2) Fall back to the upstream CDN (production, where local files aren't shipped).
  const target = entry.host + "/" + pathParts.map(encodeURIComponent).join("/") + new URL(request.url).search;
  try {
    const upstream = await fetch(target, { headers: { referer: "https://www.theweddingcompany.com/" } });
    if (!upstream.ok) return new Response("Not found", { status: upstream.status });
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/octet-stream",
        "cache-control": IMMUTABLE
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
