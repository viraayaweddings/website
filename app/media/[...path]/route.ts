import { serveMedia } from "@/worker/site/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path || [];
  const pathname = `/media/${segments.join("/")}`;
  return serveMedia({}, pathname, request.method, request.url);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return GET(request, context);
}
