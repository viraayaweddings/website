import { unstable_cache } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import { allowedCityName, allowedCitySlugs, isAllowedCitySlug, normalizeCitySlug } from "./allowed-cities";
import { prisma } from "./prisma";

export type PhotographerCard = {
  vendorId: string;
  name: string;
  href: string;
  city: string;
  citySlug: string;
  place: string;
  rating: string;
  ratingValue: number | null;
  ratingCount: number | null;
  badges: string[];
  isPartner: boolean;
  images: string[];
  lat: number | null;
  lng: number | null;
};

export type PhotographerRecord = {
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
  tags: string[];
  listingOrder: number;
  minPrice: number | null;
  maxPrice: number | null;
  latitude: number | null;
  longitude: number | null;
  about: string | null;
  searchText: string;
  images: Array<{
    originalUrl: string;
    localPath: string | null;
    mimeType: string | null;
    mediaId: string | null;
    source: string;
    position: number;
  }>;
  detailPayload: Record<string, unknown> | null;
};

export type PhotographerQueryResult = {
  size: number;
  page: number;
  limit: number;
  nextPage: number | null;
  nextPageUrl: string | null;
  results: PhotographerCard[];
};

const photographerImageFallbacks = [
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
const renderableImagePathPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

function brandedLabel(label: string) {
  return label
    .replaceAll("The Wedding Company", "Viraaya Weddings")
    .replaceAll("TWC's choice", "Viraaya's choice");
}

function labelKey(value: string) {
  return value
    .toLowerCase()
    .replace(/â€™/g, "")
    .replace(/['''`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function logPhotographerDataError(operation: string, error: unknown) {
  console.error(`[photographer-data] ${operation} failed`, error);
}

// Route every photographer image through local vendored asset handlers so no
// theweddingcompany.com host leaks into card/img src.
function photographerAssetAlias(url: string) {
  return url
    .replace("https://gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replace("https://imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replace("https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replace("https://storage.googleapis.com", "/venue-assets/storage")
    .replace("/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replace("/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replace("/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replace("/twc-venues-local/storage.googleapis.com", "/venue-assets/storage");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackPhotographerImages(seed: string, count = 4) {
  const start = hashString(seed) % photographerImageFallbacks.length;
  return Array.from({ length: Math.min(count, photographerImageFallbacks.length) }, (_, index) =>
    photographerImageFallbacks[(start + index) % photographerImageFallbacks.length]
  );
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

export function resolvePhotographerImage(
  image?: { originalUrl: string; localPath: string | null } | string | null
): string {
  if (!image) return photographerImageFallbacks[0];
  const raw =
    typeof image === "string"
      ? image
      : image.localPath && image.localPath.startsWith("/")
        ? image.localPath
        : image.originalUrl;
  if (!raw) return photographerImageFallbacks[0];
  return photographerAssetAlias(raw);
}

function isRenderablePhotographerImage(
  image?: { originalUrl: string; localPath: string | null } | string | null
) {
  return renderableImagePathPattern.test(resolvePhotographerImage(image));
}

export function photographerHref(citySlug: string, slug: string) {
  return `/wedding-photographers/${citySlug}/${slug}`;
}

const PHOTOGRAPHER_CARD_SELECT = {
  vendorId: true,
  name: true,
  slug: true,
  citySlug: true,
  shortAddress: true,
  formattedAddress: true,
  userRating: true,
  userRatingCount: true,
  isBhPartner: true,
  minPackageCost: true,
  maxPackageCost: true,
  latitude: true,
  longitude: true,
  listingOrder: true,
  searchText: true,
  city: { select: { slug: true, name: true } },
  media: {
    orderBy: { position: "asc" as const },
    take: 4,
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

function dbPhotographerToRecord(row: any): PhotographerRecord {
  const payload =
    row.detailPayload && typeof row.detailPayload === "object" ? row.detailPayload : {};
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
    tags: (row.tags || []).map((tag: { label: string }) => brandedLabel(tag.label)),
    listingOrder: row.listingOrder,
    minPrice: row.minPackageCost ?? null,
    maxPrice: row.maxPackageCost ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    about: payload.about || null,
    detailPayload: row.detailPayload || null,
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

export function toPhotographerCard(row: PhotographerRecord): PhotographerCard {
  const rating = row.userRating
    ? `${row.userRating}${row.userRatingCount ? ` (${row.userRatingCount} users)` : ""}`
    : "5";
  return {
    vendorId: row.vendorId,
    name: row.name,
    href: photographerHref(row.citySlug, row.slug),
    city: row.city,
    citySlug: row.citySlug,
    place: row.shortAddress || row.city,
    rating,
    ratingValue: row.userRating,
    ratingCount: row.userRatingCount,
    badges: row.tags || [],
    isPartner: row.isPartner,
    images: (row.images
      .filter(isRenderablePhotographerImage)
      .map((img) => resolvePhotographerImage(img))
      .filter(hasLocalImage)
      .slice(0, 4)
    ).concat(fallbackPhotographerImages(row.vendorId)).slice(0, 4),
    lat: row.latitude,
    lng: row.longitude
  };
}

function parseList(params: URLSearchParams, key: string) {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map(labelKey)
    .filter(Boolean);
}

function photographerParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>
) {
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
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
}

function emptyPhotographerQuery(params: URLSearchParams): PhotographerQueryResult {
  return {
    size: 0,
    page: Math.max(1, Number(params.get("page") || 1)),
    limit: Math.min(48, Math.max(1, Number(params.get("limit") || 24))),
    nextPage: null,
    nextPageUrl: null,
    results: []
  };
}

function selectedTabTag(tab: string): string | null {
  const selected = labelKey(tab || "all");
  if (!selected || selected === "all") return null;
  if (selected === "bestsellers") return "Bestseller";
  if (selected === "twcs choice" || selected === "viraayas choice")
    return "Viraaya's choice";
  if (selected === "premium") return "Premium";
  return tab;
}

async function queryPhotographersUncached(
  queryString: string
): Promise<PhotographerQueryResult> {
  const params = new URLSearchParams(queryString);
  const citySlug = normalizeCitySlug(params.get("city") || params.get("citySlug") || "");
  if (citySlug && !isAllowedCitySlug(citySlug)) return emptyPhotographerQuery(params);
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(params.get("limit") || 24)));
  const search = labelKey(params.get("search") || "");
  const tab = params.get("tab") || "All";
  const tabTag = selectedTabTag(tab);

  const whereParts: any[] = [
    citySlug ? { citySlug } : { citySlug: { in: allowedCitySlugs } },
    search
      ? { searchText: { contains: search, mode: "insensitive" } }
      : undefined,
    tabTag ? { tags: { some: { label: tabTag } } } : undefined
  ].filter(Boolean);

  const where: any = whereParts.length ? { AND: whereParts } : {};
  const start = (page - 1) * limit;

  const db = prisma as any;
  const [size, pageRows] = await Promise.all([
    db.photographer.count({ where }),
    db.photographer.findMany({
      where,
      select: PHOTOGRAPHER_CARD_SELECT,
      orderBy: { listingOrder: "asc" },
      skip: start,
      take: limit
    })
  ]);

  const pageItems = (pageRows as any[]).map(dbPhotographerToRecord);
  const nextPage = start + limit < size ? page + 1 : null;
  const nextParams = new URLSearchParams(params);
  if (nextPage) nextParams.set("page", String(nextPage));
  nextParams.set("limit", String(limit));

  return {
    size,
    page,
    limit,
    nextPage,
    nextPageUrl: nextPage
      ? `/api/photographers?${nextParams.toString()}`
      : null,
    results: pageItems.map(toPhotographerCard)
  };
}

const queryPhotographersCached = unstable_cache(
  queryPhotographersUncached,
  ["photographer-list-query-v4-allowed-cities"],
  { revalidate: 86400, tags: ["photographers"] }
);

export async function queryPhotographers(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): Promise<PhotographerQueryResult> {
  const params = photographerParams(input);
  try {
    return await queryPhotographersCached(stableParams(params));
  } catch (error) {
    logPhotographerDataError("queryPhotographers", error);
    return emptyPhotographerQuery(params);
  }
}

async function getPhotographerBySlugUncached(
  citySlug: string,
  slug: string
): Promise<PhotographerRecord | null> {
  const normalizedCitySlug = normalizeCitySlug(citySlug);
  if (!isAllowedCitySlug(normalizedCitySlug)) return null;
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase();

  const includeRelations = {
    city: true,
    media: true,
    tags: true
  };

  const db = prisma as any;

  const photographer = await db.photographer.findFirst({
    where: {
      citySlug: { equals: normalizedCitySlug, mode: "insensitive" },
      slug: { equals: normalizedSlug, mode: "insensitive" }
    },
    include: includeRelations
  });

  if (photographer) return dbPhotographerToRecord(photographer);

  const readableSlug = normalizedSlug.replace(/-/g, " ");
  const candidates = await db.photographer.findMany({
    where: {
      citySlug: { equals: normalizedCitySlug, mode: "insensitive" },
      OR: [
        { slug: { contains: normalizedSlug, mode: "insensitive" } },
        { searchText: { contains: readableSlug, mode: "insensitive" } }
      ]
    },
    include: includeRelations,
    take: 50
  });

  const records = (candidates as any[]).map(dbPhotographerToRecord);
  return (
    records.find(
      (record) =>
        photographerHref(record.citySlug, record.slug).toLowerCase() ===
        `/wedding-photographers/${normalizedCitySlug}/${normalizedSlug}`
    ) ||
    records.find((record) => record.slug.toLowerCase() === normalizedSlug) ||
    records[0] ||
    null
  );
}

const getPhotographerBySlugCached = unstable_cache(
  getPhotographerBySlugUncached,
  ["photographer-by-slug-v3-allowed-cities"],
  { revalidate: 86400, tags: ["photographers"] }
);

export async function getPhotographerBySlug(
  citySlug: string,
  slug: string
): Promise<PhotographerRecord | null> {
  try {
    return await getPhotographerBySlugCached(citySlug, slug);
  } catch (error) {
    logPhotographerDataError("getPhotographerBySlug", error);
    return null;
  }
}

async function getPhotographerCitiesUncached() {
  const db = prisma as any;
  const rows: Array<{ citySlug: string }> = await db.photographer.findMany({
    select: { citySlug: true },
    where: { citySlug: { in: allowedCitySlugs } },
    distinct: ["citySlug"]
  });
  return rows
    .map((row) => row.citySlug)
    .filter(Boolean)
    .sort((a, b) => allowedCitySlugs.indexOf(a) - allowedCitySlugs.indexOf(b))
    .map((slug) => ({
      slug,
      name: allowedCityName(slug)
    }));
}

const getPhotographerCitiesCached = unstable_cache(
  getPhotographerCitiesUncached,
  ["photographer-cities-v2-allowed-cities"],
  { revalidate: 86400, tags: ["photographers"] }
);

export async function getPhotographerCities() {
  try {
    return await getPhotographerCitiesCached();
  } catch (error) {
    logPhotographerDataError("getPhotographerCities", error);
    return [];
  }
}

async function getSimilarPhotographersUncached(
  citySlug: string,
  vendorId: string,
  tags: string[],
  limit: number
): Promise<PhotographerCard[]> {
  if (!isAllowedCitySlug(citySlug)) return [];
  const tagSet = new Set((tags || []).map(labelKey));
  const db = prisma as any;
  const candidates = await db.photographer.findMany({
    where: {
      citySlug: normalizeCitySlug(citySlug),
      NOT: { vendorId }
    },
    select: PHOTOGRAPHER_CARD_SELECT,
    orderBy: [
      { isBhPartner: "desc" },
      { userRating: "desc" },
      { listingOrder: "asc" }
    ],
    take: 80
  });

  return (candidates as any[])
    .map(dbPhotographerToRecord)
    .map((candidate) => ({
      photographer: candidate,
      score:
        (candidate.tags || []).filter((tag: string) =>
          tagSet.has(labelKey(tag))
        ).length *
          10 +
        (candidate.userRating || 0) +
        (candidate.isPartner ? 2 : 0)
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.photographer.listingOrder - b.photographer.listingOrder
    )
    .slice(0, limit)
    .map((item) => toPhotographerCard(item.photographer));
}

const getSimilarPhotographersCached = unstable_cache(
  getSimilarPhotographersUncached,
  ["similar-photographers-v3-allowed-cities"],
  { revalidate: 86400, tags: ["photographers"] }
);

export async function getSimilarPhotographers(
  citySlug: string,
  vendorId: string,
  limit = 10
): Promise<PhotographerCard[]> {
  try {
    const db = prisma as any;
    const row = await db.photographer.findUnique({
      where: { vendorId },
      select: { tags: { select: { label: true } } }
    });
    const tags: string[] = (row?.tags || []).map(
      (t: { label: string }) => t.label
    );
    return await getSimilarPhotographersCached(citySlug, vendorId, tags, limit);
  } catch (error) {
    logPhotographerDataError("getSimilarPhotographers", error);
    return [];
  }
}
