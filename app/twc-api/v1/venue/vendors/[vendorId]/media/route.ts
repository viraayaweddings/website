import { unstable_cache } from "next/cache";
import { prisma } from "../../../../../../lib/prisma";
import { localPublicImageExists } from "../../../../../../lib/asset-resolver";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

// Vendor IDs in the DB are UUID-shaped tokens. Bound the accepted shape so an
// attacker can't mint unbounded distinct cache keys (each unique value spawns
// its own unstable_cache entry + DB fan-out). Anything outside this shape is
// rejected before touching the cache or the database.
const VENDOR_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

const getVenueMedia = unstable_cache(
  async (vendorId: string) =>
    prisma.venueMedia.findMany({
      where: { venueId: vendorId },
      orderBy: { position: "asc" }
    }),
  ["venue-media-v2"],
  {
    revalidate: 3600,
    tags: ["venues"]
  }
);

const getPhotographerMedia = unstable_cache(
  async (vendorId: string) =>
    prisma.photographerMedia.findMany({
      where: { photographerId: vendorId },
      orderBy: { position: "asc" }
    }),
  ["photographer-gallery-media-v1"],
  {
    revalidate: 3600,
    tags: ["photographers"]
  }
);

const getDecoratorMedia = unstable_cache(
  async (vendorId: string) =>
    prisma.decoratorMedia.findMany({
      where: { decoratorId: vendorId },
      orderBy: { position: "asc" }
    }),
  ["decorator-gallery-media-v2-local-decor-fallbacks"],
  {
    revalidate: 3600,
    tags: ["decorators"]
  }
);

const getVendorKind = unstable_cache(
  async (vendorId: string) => {
    const [venue, photographer, decorator] = await Promise.all([
      prisma.venue.findUnique({ where: { vendorId }, select: { vendorId: true } }),
      prisma.photographer.findUnique({ where: { vendorId }, select: { vendorId: true } }),
      prisma.decorator.findUnique({ where: { vendorId }, select: { vendorId: true } })
    ]);
    if (venue) return "venue";
    if (photographer) return "photographer";
    if (decorator) return "decorator";
    return "unknown";
  },
  ["vendor-kind-for-gallery-media-v1"],
  {
    revalidate: 3600,
    tags: ["venues", "photographers", "decorators"]
  }
);

const PHOTOGRAPHER_IMAGE_FALLBACKS = [
  "/twc-photographers/cards/11e42d27-2a7c-4b31-bdd7-f1c7014ff273.jpg",
  "/twc-photographers/cards/1bc661d9-014c-445b-bccc-6e14a42bca7e.jpg",
  "/twc-photographers/cards/3ce9cf86-72a6-4851-9fc8-7f0f154c1ba3.jpg",
  "/twc-photographers/cards/413eac7b-e7e7-4373-97cf-88b9c046bd11.webp",
  "/twc-photographers/cards/51f63f4e-f65c-49c1-8258-6f45fb25125b.jpg",
  "/twc-photographers/cards/53b9fc12-e4ea-42e6-b34e-910fc36cf30f.png",
  "/twc-photographers/cards/6feaa4c0-c37a-4bca-8661-5ebb956b21cc.jpg",
  "/twc-photographers/cards/818423a9-c75a-47a1-a7e4-4d41e5ea032d.webp",
  "/twc-photographers/cards/88502113-16cd-44a4-a8a9-e3b2864779f5.jpg",
  "/twc-photographers/cards/a2c2896a-f018-49e0-957b-193ac74615a2.jpg",
  "/twc-photographers/cards/d0a8633e-48cf-482e-aa01-f68079f1169f.webp",
  "/twc-photographers/cards/ee6b561f-c3e6-4abb-86c9-9e9a4c354555.webp"
];

const DECORATOR_IMAGE_FALLBACKS = [
  "/images/HomePage/new/vendor-2.webp",
  "/twc-next/static/media/weddingTestimonial.2d6627ae.webp",
  "/twc-next/static/media/Mandap.d8d5d35e.webp",
  "/twc-assets/ideabook/decor.webp",
  "/images/HomePage/new/vendor-1.webp"
];

const RENDERABLE_IMAGE_PATH_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

function localizeMediaUrl(localPath: string | null, originalUrl: string) {
  const raw = localPath && localPath.startsWith("/") ? localPath : originalUrl;
  return raw
    .replace("https://gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replace("https://imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replace("https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replace("https://storage.googleapis.com", "/venue-assets/storage")
    .replace("https://maps.gstatic.com", "/venue-assets/maps")
    .replace("/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replace("/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replace("/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replace("/twc-venues-local/storage.googleapis.com", "/venue-assets/storage")
    .replace("/twc-venues-local/maps.gstatic.com", "/venue-assets/maps");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackImages(seed: string, images: string[], count = 8) {
  const start = hashString(seed) % images.length;
  return Array.from({ length: Math.min(count, images.length) }, (_, index) => images[(start + index) % images.length]);
}

function hasLocalImage(publicPath: string) {
  return localPublicImageExists(publicPath);
}

function mimeTypeFor(mediaUrl: string, fallback?: string | null) {
  if (fallback) return fallback;
  if (/\.png(?:\?|$)/i.test(mediaUrl)) return "image/png";
  if (/\.jpe?g(?:\?|$)/i.test(mediaUrl)) return "image/jpeg";
  if (/\.svg(?:\?|$)/i.test(mediaUrl)) return "image/svg+xml";
  if (/\.gif(?:\?|$)/i.test(mediaUrl)) return "image/gif";
  return "image/webp";
}

function mediaResult(mediaUrl: string, vendorId: string, priority: number, mediaId: string | null = null, mimeType?: string | null) {
  return {
    mediaId: mediaId || `local-${vendorId}-${priority}`,
    mediaType: "IMAGE",
    mimeType: mimeTypeFor(mediaUrl, mimeType),
    mediaSubtype: "GENERAL_MEDIA",
    tags: [] as string[],
    mediaUrl,
    vendorId,
    isActive: true,
    priority,
    compressedMediaUrl: null,
    videoThumbnailUrl: null
  };
}

function localResultsForMedia(
  media: Array<{ mediaId: string | null; mimeType: string | null; localPath: string | null; originalUrl: string; position: number }>,
  vendorId: string
) {
  return media
    .map((m) => ({
      ...m,
      mediaUrl: localizeMediaUrl(m.localPath, m.originalUrl)
    }))
    .filter((m) => RENDERABLE_IMAGE_PATH_PATTERN.test(m.mediaUrl))
    .filter((m) => hasLocalImage(m.mediaUrl))
    .map((m) => mediaResult(m.mediaUrl, vendorId, m.position, m.mediaId, m.mimeType));
}

// Mirrors the venue media payload from the local DB with media URLs pointed at
// vendored local files.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;
  if (!VENDOR_ID_PATTERN.test(vendorId)) {
    return Response.json(
      { nextPageUrl: null, results: [] },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "x-robots-tag": "noindex, nofollow, noarchive"
        }
      }
    );
  }
  const venueResults = localResultsForMedia(await getVenueMedia(vendorId), vendorId);
  const photographerResults = venueResults.length ? [] : localResultsForMedia(await getPhotographerMedia(vendorId), vendorId);
  const decoratorResults =
    venueResults.length || photographerResults.length ? [] : localResultsForMedia(await getDecoratorMedia(vendorId), vendorId);
  const vendorKind =
    venueResults.length ? "venue" : photographerResults.length ? "photographer" : decoratorResults.length ? "decorator" : await getVendorKind(vendorId);
  const fallbackSource = vendorKind === "decorator" ? DECORATOR_IMAGE_FALLBACKS : PHOTOGRAPHER_IMAGE_FALLBACKS;

  const fallbackResults = venueResults.length || photographerResults.length || decoratorResults.length
    ? []
    : fallbackImages(vendorId, fallbackSource).map((mediaUrl, index) => mediaResult(mediaUrl, vendorId, index));

  const results = venueResults.length
    ? venueResults
    : photographerResults.length
      ? photographerResults
      : decoratorResults.length
        ? decoratorResults
        : fallbackResults;

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
