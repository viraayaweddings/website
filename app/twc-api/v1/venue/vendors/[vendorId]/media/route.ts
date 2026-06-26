import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Mirrors weddingapi.theweddingcompany.com /v1/venue/vendors/{id}/media/ —
// served from the local DB with media URLs pointed at vendored local files.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;
  const media = await prisma.venueMedia.findMany({
    where: { venueId: vendorId },
    orderBy: { position: "asc" }
  });

  const results = media.map((m: (typeof media)[number]) => ({
    mediaId: m.mediaId,
    mediaType: "IMAGE",
    mimeType: m.mimeType || "image/webp",
    mediaSubtype: "GENERAL_MEDIA",
    tags: [] as string[],
    mediaUrl:
      m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl,
    vendorId,
    isActive: true,
    priority: m.position,
    compressedMediaUrl: null,
    videoThumbnailUrl: null
  }));

  return Response.json({ nextPageUrl: null, results });
}
