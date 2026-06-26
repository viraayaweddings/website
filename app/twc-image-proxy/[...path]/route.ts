const imageOrigin = "https://imageswedding.theweddingcompany.com";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const target = new URL(path.join("/"), `${imageOrigin}/`);
  target.search = new URL(request.url).search;

  const response = await fetch(target, {
    headers: {
      referer: "https://www.theweddingcompany.com/"
    }
  });
  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(body.byteLength),
      "content-type": response.headers.get("content-type") ?? "image/webp"
    }
  });
}
