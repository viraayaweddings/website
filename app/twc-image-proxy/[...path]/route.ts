const imageOrigin = "https://imageswedding.theweddingcompany.com";

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
const upstreamHeaders = {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!isSafePath(path)) return new Response("Not found", { status: 404 });

  const target = new URL(path.join("/"), `${imageOrigin}/`);
  target.search = new URL(request.url).search;

  const response = await fetch(target, { headers: upstreamHeaders });
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!response.ok || !contentType || !allowedContentTypes.has(contentType)) {
    return new Response("Not found", {
      status: response.ok ? 404 : response.status,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }

  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(body.byteLength),
      "content-type": response.headers.get("content-type") ?? "image/webp",
      "x-content-type-options": "nosniff"
    }
  });
}
