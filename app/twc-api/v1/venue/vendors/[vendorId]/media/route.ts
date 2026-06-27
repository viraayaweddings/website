import { unstable_cache } from "next/cache";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const getVenueMedia = unstable_cache(
  async (vendorId: string) =>
    prisma.venueMedia.findMany({
      where: { venueId: vendorId },
      orderBy: { position: "asc" }
    }),
  ["venue-media"],
  {
    revalidate: 3600,
    tags: ["venues"]
  }
);

// Mirrors the venue media payload from the local DB with media URLs pointed at
// vendored local files.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;
  const media = await getVenueMedia(vendorId);

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

  return Response.json(
    { nextPageUrl: null, results },
    {
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive"
      }
    }
  );
}
