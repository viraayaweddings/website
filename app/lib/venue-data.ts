import { unstable_cache } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import { allowedCitySlugs, isAllowedCitySlug, normalizeCitySlug } from "./allowed-cities";
import { prisma } from "./prisma";

const venueImageFallbacks = [
  "/twc-venues/cards/riva-1.jpg",
  "/twc-venues/cards/riva-2.jpg",
  "/twc-venues/cards/riva-3.webp",
  "/twc-venues/cards/riva-4.jpg",
  "/twc-venues/cards/goldfinch-1.jpg",
  "/twc-venues/cards/goldfinch-2.jpg",
  "/twc-venues/cards/goldfinch-3.jpg",
  "/twc-venues/cards/goldfinch-4.jpg",
  "/twc-venues/cards/amita-1.webp",
  "/twc-venues/cards/amita-2.webp",
  "/twc-venues/cards/amita-3.webp",
  "/twc-venues/cards/amita-4.webp"
];
const venueImageFallback = venueImageFallbacks[0];
const renderableImagePathPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

function venueAssetAlias(url: string) {
  return url
    .replace("/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replace("/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replace("/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replace("/twc-venues-local/storage.googleapis.com", "/venue-assets/storage")
    .replace("https://storage.googleapis.com", "/venue-assets/storage")
    .replace("/twc-venues-local/maps.gstatic.com", "/venue-assets/maps");
}

function brandedLabel(label: string) {
  return label
    .replaceAll("The Wedding Company", "Viraaya Weddings")
    .replaceAll("TWC's choice", "Viraaya's choice")
    .replaceAll("TWC’s choice", "Viraaya’s choice");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackVenueImages(seed: string, count = 4) {
  const start = hashString(seed) % venueImageFallbacks.length;
  return Array.from({ length: Math.min(count, venueImageFallbacks.length) }, (_, index) =>
    venueImageFallbacks[(start + index) % venueImageFallbacks.length]
  );
}

function localFileForDeployablePublicPath(publicPath: string) {
  if (publicPath.startsWith("/venue-assets/gcpimages/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-company-assets",
      "gcpimages.theweddingcompany.com",
      ...publicPath.replace("/venue-assets/gcpimages/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/imageswedding/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-company-assets",
      "imageswedding.theweddingcompany.com",
      ...publicPath.replace("/venue-assets/imageswedding/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/weddingimage/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-company-assets",
      "weddingimage.betterhalf.ai",
      ...publicPath.replace("/venue-assets/weddingimage/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/storage/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-company-assets",
      "storage.googleapis.com",
      ...publicPath.replace("/venue-assets/storage/", "").split("/")
    );
  }
  if (publicPath.startsWith("/")) {
    return path.join(process.cwd(), "public", ...publicPath.slice(1).split("/"));
  }
  return null;
}

function hasDeployableImage(publicPath: string) {
  const file = localFileForDeployablePublicPath(publicPath);
  return Boolean(
    renderableImagePathPattern.test(publicPath) &&
    file &&
    fs.existsSync(file)
  );
}

export type VenueImage = {
  originalUrl: string;
  url: string;
  mimeType?: string | null;
  mediaId?: string | null;
  source?: string;
};

export type VenueRecord = {
  vendorId: string;
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  shortAddress: string;
  formattedAddress: string;
  userRating: number | null;
  userRatingCount: number | null;
  isBhPartner: boolean;
  bhPartnerDealText: string | null;
  tags: string[];
  listingOrder: number;
  price: {
    perPlate?: { minValue?: number | null; maxValue?: number | null } | null;
    perDay?: { minValue?: number | null; maxValue?: number | null } | null;
  };
  capacity?: { minValue?: number | null; maxValue?: number | null } | null;
  rooms?: { minValue?: number | null; maxValue?: number | null } | null;
  parkingCount?: number | null;
  coordinates?: [number, number] | null;
  venueType?: string | null;
  areasAvailable: Array<Record<string, unknown>>;
  amenities: Array<unknown>;
  facilities: Array<unknown>;
  about?: string | null;
  images: VenueImage[];
  detailPayload?: Record<string, unknown> | null;
  searchText: string;
};

export type VenueCard = {
  vendorId: string;
  name: string;
  href: string;
  city: string;
  citySlug: string;
  place: string;
  rating: string;
  ratingValue: number | null;
  ratingCount: number | null;
  guests: string;
  minGuests: string;
  maxGuests: string;
  badges: string[];
  isPartner: boolean;
  images: string[];
  lat: number | null;
  lng: number | null;
};

export type VenueQueryResult = {
  size: number;
  page: number;
  limit: number;
  nextPage: number | null;
  nextPageUrl: string | null;
  results: VenueCard[];
};

function logVenueDataError(operation: string, error: unknown) {
  console.error(`[venue-data] ${operation} failed`, error);
}

const VENUE_CARD_SELECT = {
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
  minPerPlateCost: true,
  maxPerPlateCost: true,
  minPerDayCost: true,
  maxPerDayCost: true,
  minRoomCount: true,
  maxRoomCount: true,
  minAreaCapacity: true,
  maxAreaCapacity: true,
  parkingCount: true,
  latitude: true,
  longitude: true,
  listingOrder: true,
  searchText: true,
  city: { select: { slug: true, name: true } },
  media: {
    orderBy: { position: "asc" },
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

function dbVenueToRecord(row: any): VenueRecord {
  const payload = row.listingPayload && typeof row.listingPayload === "object" ? row.listingPayload : {};
  const media = [...(row.media || [])].sort((a, b) => a.position - b.position);
  return {
    vendorId: row.vendorId,
    name: row.name,
    slug: row.slug,
    city: row.city?.name || payload.city || row.citySlug,
    citySlug: row.citySlug,
    shortAddress: row.shortAddress || "",
    formattedAddress: row.formattedAddress || "",
    userRating: row.userRating,
    userRatingCount: row.userRatingCount,
    isBhPartner: row.isBhPartner,
    bhPartnerDealText: row.bhPartnerDealText,
    tags: (row.tags || []).map((tag: { label: string }) => brandedLabel(tag.label)),
    listingOrder: row.listingOrder,
    price: {
      perPlate: {
        minValue: row.minPerPlateCost,
        maxValue: row.maxPerPlateCost
      },
      perDay: {
        minValue: row.minPerDayCost,
        maxValue: row.maxPerDayCost
      }
    },
    capacity: {
      minValue: row.minAreaCapacity,
      maxValue: row.maxAreaCapacity
    },
    rooms: {
      minValue: row.minRoomCount,
      maxValue: row.maxRoomCount
    },
    parkingCount: row.parkingCount,
    coordinates:
      row.longitude !== null && row.latitude !== null ? [row.longitude, row.latitude] : null,
    venueType: payload.venueType || null,
    areasAvailable: (row.areas || []).map((area: any) => ({
      name: area.name,
      type: area.areaType,
      seatingCapacity: area.seatingCapacity,
      floatingCapacity: area.floatingCapacity
    })),
    amenities: (row.amenities || []).map((amenity: { label: string }) => amenity.label),
    facilities: (row.facilities || []).map((facility: { label: string }) => facility.label),
    about: payload.about || null,
    detailPayload: row.detailPayload || null,
    images: media.flatMap((image: any) => {
      const localPath = typeof image.localPath === "string" && image.localPath.startsWith("/")
        ? venueAssetAlias(image.localPath)
        : venueImageFallback;
      if (!hasDeployableImage(localPath)) return [];
      return [{
        originalUrl: image.originalUrl,
        url: localPath,
        mimeType: image.mimeType,
        mediaId: image.mediaId,
        source: image.source
      }];
    }),
    searchText: row.searchText || ""
  };
}

export function resolveVenueImage(image?: VenueImage | string | null) {
  if (!image) return venueImageFallback;
  if (typeof image === "string") return image;
  if (image.url) return image.url;
  return venueImageFallback;
}

function minMaxLabel(range?: { minValue?: number | null; maxValue?: number | null } | null) {
  if (!range) return "";
  const min = range.minValue ?? null;
  const max = range.maxValue ?? null;
  if (min === null && max === null) return "";
  if (min !== null && max !== null && min !== max) return `${min} - ${max}`;
  return String(min ?? max);
}

export function venueHref(venue: Pick<VenueRecord, "citySlug" | "slug">) {
  return `/wedding-venues/${venue.citySlug}/${venue.slug}`;
}

export function toVenueCard(venue: VenueRecord): VenueCard {
  const capacity = minMaxLabel(venue.capacity);
  const rating = venue.userRating
    ? `${venue.userRating}${venue.userRatingCount ? ` (${venue.userRatingCount} users)` : ""}`
    : "5";
  return {
    vendorId: venue.vendorId,
    name: venue.name,
    href: venueHref(venue),
    city: venue.city,
    citySlug: venue.citySlug,
    place: venue.shortAddress || venue.city,
    rating,
    ratingValue: venue.userRating,
    ratingCount: venue.userRatingCount,
    guests: capacity || "Contact venue",
    minGuests: venue.capacity?.minValue != null ? String(venue.capacity.minValue) : "",
    maxGuests: venue.capacity?.maxValue != null ? String(venue.capacity.maxValue) : "",
    badges: venue.tags || [],
    isPartner: venue.isBhPartner,
    images: venue.images.slice(0, 4).map(resolveVenueImage).concat(fallbackVenueImages(venue.vendorId)).slice(0, 4),
    lat: venue.coordinates ? venue.coordinates[1] : null,
    lng: venue.coordinates ? venue.coordinates[0] : null
  };
}

function labelKey(value: string) {
  return value
    .toLowerCase()
    .replace(/â€™/g, "")
    .replace(/['’‘`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseList(params: URLSearchParams, key: string) {
  return params.getAll(key).flatMap((value) => value.split(",")).map(labelKey).filter(Boolean);
}

function overlaps(range: { minValue?: number | null; maxValue?: number | null } | null | undefined, min: number, max: number) {
  if (!range) return false;
  const rMin = Number(range.minValue ?? 0);
  const rMax = Number(range.maxValue ?? rMin);
  return rMax >= min && rMin <= max;
}

function minRatingFromLabels(ratings: string[]) {
  if (!ratings.length) return null;
  const values = ratings.map((rating) => Number(rating.match(/[\d.]+/)?.[0] || 0)).filter(Boolean);
  return values.length ? Math.min(...values) : null;
}

function rangeWhere(minField: string, maxField: string, values: Array<[number, number]>) {
  if (!values.length) return undefined;
  return {
    OR: values.map(([min, max]) => ({
      AND: [
        { OR: [{ [maxField]: { gte: min } }, { [maxField]: null }] },
        { OR: [{ [minField]: { lte: max } }, { [minField]: null }] }
      ]
    }))
  };
}

function textWhere(values: string[]) {
  if (!values.length) return undefined;
  return {
    OR: values.flatMap((value) => {
      const candidates = [
        value,
        value.replace(/\s+venues?$/, ""),
        value.replace(/\s+halls?$/, " hall"),
        value.replace("non - vegetarian", "non vegetarian")
      ].filter(Boolean);
      return candidates.map((candidate) => ({
        searchText: { contains: candidate, mode: "insensitive" }
      }));
    })
  };
}

function selectedTabTag(tab: string) {
  const selected = labelKey(tab || "all");
  if (!selected || selected === "all") return null;
  if (selected === "bestsellers") return "Bestseller";
  if (selected === "twcs choice" || selected === "viraayas choice") return "TWC’s choice";
  return tab;
}

function venueParams(input: URLSearchParams | Record<string, string | string[] | undefined>) {
  return input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(
        Object.entries(input).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((item) => [key, item]) : value ? [[key, value]] : []
        )
      );
}

function stableParams(params: URLSearchParams) {
  return [...params.entries()]
    .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function emptyVenueQuery(params: URLSearchParams): VenueQueryResult {
  return {
    size: 0,
    page: Math.max(1, Number(params.get("page") || 1)),
    limit: Math.min(48, Math.max(1, Number(params.get("limit") || 24))),
    nextPage: null,
    nextPageUrl: null,
    results: []
  };
}

async function queryVenuesUncached(queryString: string): Promise<VenueQueryResult> {
  const params = new URLSearchParams(queryString);
  const citySlug = labelKey(params.get("city") || params.get("citySlug") || "");
  if (citySlug && !isAllowedCitySlug(citySlug)) return emptyVenueQuery(params);
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(params.get("limit") || 24)));
  const search = labelKey(params.get("search") || "");
  const tab = params.get("tab") || "All";
  const guests = parseList(params, "guests");
  const venueTypes = parseList(params, "venueType");
  const venueAreas = parseList(params, "venueArea");
  const facilities = parseList(params, "facility");
  const food = parseList(params, "food");
  const rooms = parseList(params, "rooms");
  const ratings = parseList(params, "rating");
  const guestBuckets: Record<string, [number, number]> = {
    "< 100": [0, 99],
    "100 - 250": [100, 250],
    "250 - 500": [250, 500],
    "500 - 1000": [500, 1000],
    "> 1000": [1000, 999999]
  };
  const roomBuckets: Record<string, [number, number]> = {
    "< 30": [0, 29],
    "30 - 60": [30, 60],
    "61 - 100": [61, 100],
    "100 - 200": [100, 200],
    "200 - 1000": [200, 1000]
  };
  const tabTag = selectedTabTag(tab);
  const minRating = minRatingFromLabels(ratings);
  const whereParts: any[] = [
    citySlug ? { citySlug } : { citySlug: { in: allowedCitySlugs } },
    search ? { searchText: { contains: search, mode: "insensitive" } } : undefined,
    tabTag ? { tags: { some: { label: tabTag } } } : undefined,
    minRating !== null ? { userRating: { gte: minRating } } : undefined,
    rangeWhere("minAreaCapacity", "maxAreaCapacity", guests.map((value) => guestBuckets[value]).filter(Boolean)),
    rangeWhere("minRoomCount", "maxRoomCount", rooms.map((value) => roomBuckets[value]).filter(Boolean)),
    textWhere(venueTypes),
    textWhere(venueAreas),
    textWhere(facilities),
    textWhere(food)
  ].filter(Boolean);
  const where: any = whereParts.length ? { AND: whereParts } : {};
  const start = (page - 1) * limit;
  const [size, pageRows] = await Promise.all([
    prisma.venue.count({ where }),
    prisma.venue.findMany({
      where,
      select: VENUE_CARD_SELECT,
      orderBy: { listingOrder: "asc" },
      skip: start,
      take: limit
    })
  ]);
  const pageItems = pageRows.map(dbVenueToRecord);
  const nextPage = start + limit < size ? page + 1 : null;
  const nextParams = new URLSearchParams(params);
  if (nextPage) nextParams.set("page", String(nextPage));
  nextParams.set("limit", String(limit));

  return {
    size,
    page,
    limit,
    nextPage,
    nextPageUrl: nextPage ? `/api/venues?${nextParams.toString()}` : null,
    results: pageItems.map(toVenueCard)
  };
}

const queryVenuesCached = unstable_cache(queryVenuesUncached, ["venue-list-query-v3-allowed-cities"], {
  revalidate: 900,
  tags: ["venues"]
});

export async function queryVenues(input: URLSearchParams | Record<string, string | string[] | undefined>) {
  const params = venueParams(input);

  try {
    return await queryVenuesCached(stableParams(params));
  } catch (error) {
    logVenueDataError("queryVenues", error);
    return emptyVenueQuery(params);
  }
}

async function getVenueBySlugUncached(citySlug: string, venueSlug: string) {
  const normalizedCitySlug = normalizeCitySlug(citySlug);
  if (!isAllowedCitySlug(normalizedCitySlug)) return null;
  const normalizedVenueSlug = decodeURIComponent(venueSlug).trim().toLowerCase();
  const includeVenueRelations = {
    city: true,
    media: true,
    tags: true,
    areas: true,
    amenities: true,
    facilities: true
  };
  const venue = await prisma.venue.findFirst({
    where: {
      citySlug: { equals: normalizedCitySlug, mode: "insensitive" },
      slug: { equals: normalizedVenueSlug, mode: "insensitive" }
    },
    include: includeVenueRelations
  });
  if (venue) return dbVenueToRecord(venue);

  const readableSlug = normalizedVenueSlug.replace(/-/g, " ");
  const candidates = await prisma.venue.findMany({
    where: {
      citySlug: { equals: normalizedCitySlug, mode: "insensitive" },
      OR: [
        { slug: { contains: normalizedVenueSlug, mode: "insensitive" } },
        { searchText: { contains: readableSlug, mode: "insensitive" } }
      ]
    },
    include: includeVenueRelations,
    take: 50
  });
  const records = candidates.map(dbVenueToRecord);
  return (
    records.find((record) => venueHref(record).toLowerCase() === `/wedding-venues/${normalizedCitySlug}/${normalizedVenueSlug}`) ||
    records.find((record) => record.slug.toLowerCase() === normalizedVenueSlug) ||
    records[0] ||
    null
  );
}

const getVenueBySlugCached = unstable_cache(getVenueBySlugUncached, ["venue-by-slug-v3-allowed-cities"], {
  revalidate: 86400,
  tags: ["venues"]
});

export async function getVenueBySlug(citySlug: string, venueSlug: string) {
  try {
    return await getVenueBySlugCached(citySlug, venueSlug);
  } catch (error) {
    logVenueDataError("getVenueBySlug", error);
    return null;
  }
}

async function getCityBySlugUncached(citySlug: string) {
  if (!isAllowedCitySlug(citySlug)) return null;
  return prisma.city.findUnique({
    where: { slug: normalizeCitySlug(citySlug) },
    select: { slug: true, name: true, sourceCount: true, importedCount: true }
  });
}

const getCityBySlugCached = unstable_cache(getCityBySlugUncached, ["venue-city-by-slug-v2-allowed-cities"], {
  revalidate: 86400,
  tags: ["venues"]
});

export async function getCityBySlug(citySlug: string) {
  try {
    return await getCityBySlugCached(citySlug);
  } catch (error) {
    logVenueDataError("getCityBySlug", error);
    return null;
  }
}

async function getVenueCitiesUncached() {
  const rows = await prisma.city.findMany({
    where: { slug: { in: allowedCitySlugs } },
    select: { slug: true, name: true, sourceCount: true, importedCount: true }
  });
  return rows.sort((a, b) => allowedCitySlugs.indexOf(a.slug) - allowedCitySlugs.indexOf(b.slug));
}

const getVenueCitiesCached = unstable_cache(getVenueCitiesUncached, ["venue-cities-v2-allowed-cities"], {
  revalidate: 86400,
  tags: ["venues"]
});

export async function getVenueCities() {
  try {
    return await getVenueCitiesCached();
  } catch (error) {
    logVenueDataError("getVenueCities", error);
    return [];
  }
}

async function getSimilarVenuesUncached(citySlug: string, vendorId: string, tags: string[], limit: number) {
  if (!isAllowedCitySlug(citySlug)) return [];
  const tagSet = new Set((tags || []).map(labelKey));
  const candidates = await prisma.venue.findMany({
    where: {
      citySlug: normalizeCitySlug(citySlug),
      NOT: { vendorId }
    },
    select: VENUE_CARD_SELECT,
    orderBy: [{ isBhPartner: "desc" }, { userRating: "desc" }, { listingOrder: "asc" }],
    take: 80
  });
  return candidates
    .map(dbVenueToRecord)
    .map((candidate) => ({
      venue: candidate,
      score:
        (candidate.tags || []).filter((tag) => tagSet.has(labelKey(tag))).length * 10 +
        (candidate.userRating || 0) +
        (candidate.isBhPartner ? 2 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.venue.listingOrder - b.venue.listingOrder)
    .slice(0, limit)
    .map((item) => toVenueCard(item.venue));
}

const getSimilarVenuesCached = unstable_cache(getSimilarVenuesUncached, ["similar-venues-v3-allowed-cities"], {
  revalidate: 86400,
  tags: ["venues"]
});

export async function getSimilarVenues(venue: VenueRecord, limit = 10) {
  try {
    return await getSimilarVenuesCached(venue.citySlug, venue.vendorId, venue.tags || [], limit);
  } catch (error) {
    logVenueDataError("getSimilarVenues", error);
    return [];
  }
}
