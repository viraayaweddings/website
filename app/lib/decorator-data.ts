import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export type DecoratorQueryResult = {
  size: number;
  page: number;
  limit: number;
  nextPage: number | null;
  nextPageUrl: string | null;
  results: DecoratorVendorPayload[];
};

export type DecoratorVendorPayload = {
  vendorId: string;
  urlSlug: string;
  media: Array<{
    url: string;
    mimeType: string;
    mediaId: string | null;
    compressedMediaUrl?: string | null;
  }>;
  venueName: string;
  meta: {
    startsAt: number | null;
    indoorPrice?: number | null;
    outdoorPrice?: number | null;
    areasAvailable: null;
  };
  formattedAddress: string;
  city: string;
  citySlug: string;
  shortAddress: string;
  userRating: number | null;
  businessCategory: "DECORATION";
  specialTags: string[];
  isBhPartner: boolean;
  bhPartnerDealText: string | null;
  userRatingCount: number | null;
  coordinates: [number, number] | null;
};

export type DecoratorRecord = {
  vendorId: string;
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  shortAddress: string;
  formattedAddress: string;
  userRating: number | null;
  userRatingCount: number | null;
  isPartner: boolean;
  bhPartnerDealText: string | null;
  tags: string[];
  listingOrder: number;
  minDecorCost: number | null;
  indoorPrice: number | null;
  outdoorPrice: number | null;
  latitude: number | null;
  longitude: number | null;
  searchText: string;
  images: Array<{
    originalUrl: string;
    localPath: string | null;
    mimeType: string | null;
    mediaId: string | null;
    source: string;
    position: number;
  }>;
  listingPayload: Record<string, unknown>;
  detailPayload: Record<string, unknown> | null;
  seoPayload: Record<string, unknown> | null;
};

const decoratorImageFallbacks = [
  "/images/HomePage/new/vendor-2.webp",
  "/twc-next/static/media/weddingTestimonial.2d6627ae.webp",
  "/twc-next/static/media/Mandap.d8d5d35e.webp",
  "/twc-assets/ideabook/decor.webp",
  "/images/HomePage/new/vendor-1.webp"
];
const decoratorImageFallback = decoratorImageFallbacks[0];
const renderableImagePathPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

function brandedLabel(label: string) {
  return label
    .replaceAll("The Wedding Company", "Viraaya Weddings")
    .replaceAll("TWC's choice", "Viraaya's choice")
    .replaceAll("TWC’s choice", "Viraaya's choice");
}

function labelKey(value: string) {
  return value
    .toLowerCase()
    .replace(/Ã¢â‚¬â„¢/g, "")
    .replace(/['''`Â´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugKey(value: string) {
  return decodeURIComponent(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackDecoratorImages(seed: string, count = 8) {
  const start = hashString(seed) % decoratorImageFallbacks.length;
  return Array.from({ length: Math.min(count, decoratorImageFallbacks.length) }, (_, index) =>
    decoratorImageFallbacks[(start + index) % decoratorImageFallbacks.length]
  );
}

function logDecoratorDataError(operation: string, error: unknown) {
  console.error(`[decorator-data] ${operation} failed`, error);
}

function decoratorAssetAlias(url: string) {
  return url
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

function localFileForPublicPath(publicPath: string) {
  if (publicPath.startsWith("/venue-assets/gcpimages/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "gcpimages.theweddingcompany.com",
      ...publicPath.replace("/venue-assets/gcpimages/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/imageswedding/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "imageswedding.theweddingcompany.com",
      ...publicPath.replace("/venue-assets/imageswedding/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/weddingimage/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "weddingimage.betterhalf.ai",
      ...publicPath.replace("/venue-assets/weddingimage/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/storage/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "storage.googleapis.com",
      ...publicPath.replace("/venue-assets/storage/", "").split("/")
    );
  }
  if (publicPath.startsWith("/")) {
    return path.join(process.cwd(), "public", ...publicPath.slice(1).split("/"));
  }
  return null;
}

function hasLocalImage(publicPath: string) {
  const file = localFileForPublicPath(publicPath);
  return Boolean(file && fs.existsSync(file));
}

export function resolveDecoratorImage(
  image?: { originalUrl: string; localPath: string | null } | string | null
): string {
  if (!image) return decoratorImageFallback;
  const raw =
    typeof image === "string"
      ? image
      : image.localPath && image.localPath.startsWith("/")
        ? image.localPath
        : image.originalUrl;
  return raw ? decoratorAssetAlias(raw) : decoratorImageFallback;
}

function isRenderableDecoratorImage(
  image?: { originalUrl: string; localPath: string | null } | string | null
) {
  const src = resolveDecoratorImage(image);
  return renderableImagePathPattern.test(src) && hasLocalImage(src);
}

export function decoratorHref(citySlug: string, slug: string) {
  return `/wedding-decorators/${citySlug || "bengaluru"}/${slug}`;
}

const DECORATOR_CARD_SELECT = {
  vendorId: true,
  name: true,
  slug: true,
  citySlug: true,
  shortAddress: true,
  formattedAddress: true,
  userRating: true,
  userRatingCount: true,
  isBhPartner: true,
  bhPartnerDealText: true,
  minDecorCost: true,
  indoorPrice: true,
  outdoorPrice: true,
  latitude: true,
  longitude: true,
  listingOrder: true,
  listingPayload: true,
  detailPayload: true,
  seoPayload: true,
  searchText: true,
  city: { select: { slug: true, name: true } },
  media: {
    orderBy: { position: "asc" as const },
    take: 8,
    select: {
      originalUrl: true,
      localPath: true,
      mimeType: true,
      mediaId: true,
      source: true,
      position: true
    }
  },
  tags: { select: { label: true } }
} as const;

function dbDecoratorToRecord(row: any): DecoratorRecord {
  const media = [...(row.media || [])].sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  return {
    vendorId: row.vendorId,
    name: row.name,
    slug: row.slug,
    city: row.city?.name || row.citySlug,
    citySlug: row.citySlug,
    shortAddress: row.shortAddress || "",
    formattedAddress: row.formattedAddress || "",
    userRating: row.userRating ?? null,
    userRatingCount: row.userRatingCount ?? null,
    isPartner: row.isBhPartner ?? false,
    bhPartnerDealText: row.bhPartnerDealText ?? null,
    tags: (row.tags || []).map((tag: { label: string }) => brandedLabel(tag.label)),
    listingOrder: row.listingOrder,
    minDecorCost: row.minDecorCost ?? null,
    indoorPrice: row.indoorPrice ?? null,
    outdoorPrice: row.outdoorPrice ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    detailPayload: row.detailPayload || null,
    seoPayload: row.seoPayload || null,
    listingPayload: row.listingPayload || {},
    searchText: row.searchText || "",
    images: media.map((img: any) => ({
      originalUrl: img.originalUrl,
      localPath: img.localPath ?? null,
      mimeType: img.mimeType ?? null,
      mediaId: img.mediaId ?? null,
      source: img.source,
      position: img.position
    }))
  };
}

export function toDecoratorVendorPayload(row: DecoratorRecord): DecoratorVendorPayload {
  const images = row.images.filter(isRenderableDecoratorImage).slice(0, 8);
  const media = images.length
    ? images.map((img) => ({
        url: resolveDecoratorImage(img),
        mimeType: img.mimeType || "image/webp",
        mediaId: img.mediaId,
        compressedMediaUrl: null
      }))
    : fallbackDecoratorImages(row.vendorId).map((url) => ({
        url,
        mimeType: /\.jpe?g(?:\?|$)/i.test(url) ? "image/jpeg" : "image/webp",
        mediaId: null,
        compressedMediaUrl: null
      }));

  return {
    vendorId: row.vendorId,
    urlSlug: row.slug,
    media,
    venueName: row.name,
    meta: {
      startsAt: null,
      indoorPrice: null,
      outdoorPrice: null,
      areasAvailable: null
    },
    formattedAddress: row.formattedAddress,
    city: row.city,
    citySlug: row.citySlug,
    shortAddress: row.shortAddress || row.city,
    userRating: row.userRating,
    businessCategory: "DECORATION",
    specialTags: row.tags,
    isBhPartner: row.isPartner,
    bhPartnerDealText: row.bhPartnerDealText,
    userRatingCount: row.userRatingCount,
    coordinates:
      row.longitude != null && row.latitude != null ? [row.longitude, row.latitude] : null
  };
}

function decoratorParams(input: URLSearchParams | Record<string, string | string[] | undefined>) {
  return input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(
        Object.entries(input).flatMap(([key, value]) =>
          Array.isArray(value)
            ? value.map((item) => [key, item])
            : value
              ? [[key, value]]
              : []
        )
      );
}

function stableParams(params: URLSearchParams) {
  return [...params.entries()]
    .sort(
      ([keyA, valueA], [keyB, valueB]) =>
        keyA.localeCompare(keyB) || valueA.localeCompare(valueB)
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function emptyDecoratorQuery(params: URLSearchParams): DecoratorQueryResult {
  return {
    size: 0,
    page: Math.max(1, Number(params.get("page") || 1)),
    limit: Math.min(48, Math.max(1, Number(params.get("limit") || 24))),
    nextPage: null,
    nextPageUrl: null,
    results: []
  };
}

function selectedTag(value: string | null): string | null {
  const selected = labelKey(value || "");
  if (!selected || selected === "all" || selected === "default") return null;
  if (selected === "1004" || selected === "bestsellers") return null;
  if (
    selected === "1005" ||
    selected === "twcs choice" ||
    selected === "twcs-choice" ||
    selected === "viraayas choice" ||
    selected === "viraayas-choice"
  ) {
    return "Viraaya's choice";
  }
  if (selected === "1002" || selected === "premium") return "Premium";
  return value;
}

async function queryDecoratorsUncached(queryString: string): Promise<DecoratorQueryResult> {
  const params = new URLSearchParams(queryString);
  const citySlug = slugKey(
    params.get("citySlug") || params.get("city") || params.get("decorCity") || ""
  );
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(params.get("limit") || 24)));
  const search = labelKey(params.get("search") || params.get("q") || params.get("vendorName") || "");
  const tag = selectedTag(params.get("specialTags") || params.get("tab"));

  const whereParts: any[] = [
    citySlug ? { citySlug: { equals: citySlug, mode: "insensitive" } } : undefined,
    search ? { searchText: { contains: search, mode: "insensitive" } } : undefined,
    tag ? { tags: { some: { label: { equals: tag, mode: "insensitive" } } } } : undefined
  ].filter(Boolean);

  const where: any = whereParts.length ? { AND: whereParts } : {};
  const start = (page - 1) * limit;
  const db = prisma as any;
  const [size, pageRows] = await Promise.all([
    db.decorator.count({ where }),
    db.decorator.findMany({
      where,
      select: DECORATOR_CARD_SELECT,
      orderBy: { listingOrder: "asc" },
      skip: start,
      take: limit
    })
  ]);

  const nextPage = start + limit < size ? page + 1 : null;
  const nextParams = new URLSearchParams(params);
  if (nextPage) nextParams.set("page", String(nextPage));
  nextParams.set("limit", String(limit));

  // The mirrored TWC bundle parses nextPageUrl with `new URL(...)` (getPageParm)
  // to read the `page` query param, so this MUST be an absolute URL or the
  // infinite-scroll query throws "Invalid URL" and blanks the listing.
  return {
    size,
    page,
    limit,
    nextPage,
    nextPageUrl: nextPage
      ? `https://viraayaweddings.com/twc-api/v1/decor/vendors/?${nextParams.toString()}`
      : null,
    results: (pageRows as any[]).map(dbDecoratorToRecord).map(toDecoratorVendorPayload)
  };
}

const queryDecoratorsCached = unstable_cache(queryDecoratorsUncached, ["decorator-list-query-v7-local-decor-fallbacks"], {
  revalidate: 86400,
  tags: ["decorators"]
});

export async function queryDecorators(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): Promise<DecoratorQueryResult> {
  const params = decoratorParams(input);
  try {
    return await queryDecoratorsCached(stableParams(params));
  } catch (error) {
    logDecoratorDataError("queryDecorators", error);
    return emptyDecoratorQuery(params);
  }
}

async function getDecoratorBySlugUncached(
  citySlug: string,
  slug: string
): Promise<DecoratorRecord | null> {
  const normalizedCitySlug = slugKey(citySlug);
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase();
  const includeRelations = { city: true, media: true, tags: true };
  const db = prisma as any;

  const decorator = await db.decorator.findFirst({
    where: {
      citySlug: { equals: normalizedCitySlug, mode: "insensitive" },
      slug: { equals: normalizedSlug, mode: "insensitive" }
    },
    include: includeRelations
  });
  if (decorator) return dbDecoratorToRecord(decorator);

  const candidates = await db.decorator.findMany({
    where: {
      OR: [
        { slug: { equals: normalizedSlug, mode: "insensitive" } },
        { slug: { contains: normalizedSlug, mode: "insensitive" } },
        { searchText: { contains: normalizedSlug.replace(/-/g, " "), mode: "insensitive" } }
      ]
    },
    include: includeRelations,
    take: 50
  });

  const records = (candidates as any[]).map(dbDecoratorToRecord);
  return (
    records.find(
      (record) =>
        record.citySlug.toLowerCase() === normalizedCitySlug &&
        record.slug.toLowerCase() === normalizedSlug
    ) ||
    records.find((record) => record.slug.toLowerCase() === normalizedSlug) ||
    records[0] ||
    null
  );
}

const getDecoratorBySlugCached = unstable_cache(
  getDecoratorBySlugUncached,
  ["decorator-by-slug-v2"],
  { revalidate: 86400, tags: ["decorators"] }
);

export async function getDecoratorBySlug(citySlug: string, slug: string) {
  try {
    return await getDecoratorBySlugCached(citySlug, slug);
  } catch (error) {
    logDecoratorDataError("getDecoratorBySlug", error);
    return null;
  }
}

async function getDecoratorCitiesUncached() {
  const db = prisma as any;
  const rows = await db.decoratorCity.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" }
  });
  return rows;
}

const getDecoratorCitiesCached = unstable_cache(
  getDecoratorCitiesUncached,
  ["decorator-cities-v2"],
  { revalidate: 86400, tags: ["decorators"] }
);

export async function getDecoratorCities() {
  try {
    return await getDecoratorCitiesCached();
  } catch (error) {
    logDecoratorDataError("getDecoratorCities", error);
    return [];
  }
}
