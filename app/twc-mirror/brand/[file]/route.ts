import fs from "node:fs/promises";
import path from "node:path";

const allowedFiles = new Set([
  "favicon.png",
  "viraaya-logo-full.png",
  "viraaya-logo-header.png"
]);

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ file: string }>;
  }
) {
  const { file } = await params;

  if (!allowedFiles.has(file)) {
    return new Response("Not found", { status: 404 });
  }

  const body = await fs.readFile(path.join(process.cwd(), "public", "brand", file));
  return new Response(body, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
