import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const root = process.cwd();
const capturedListingPath = path.join(root, "data", "captured-company", "wedding-decorators.html");
const capturedDetailPath = path.join(root, "data", "decorators", "captured-decorator-detail.html");
const decoratorApiUrl = "https://weddingapi.betterhalf.ai/v1/decor/vendors/";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return "postgresql://postgres@localhost:55432/viraayaweddings?schema=public";
}

function getPrismaPgConfig() {
  const parsed = new URL(getDatabaseUrl());
  const sslMode = parsed.searchParams.get("sslmode");
  const usesSsl = sslMode && sslMode.toLowerCase() !== "disable";
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");
  const poolTuning = {
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true
  };
  return usesSsl
    ? { connectionString: parsed.toString(), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }, ...poolTuning }
    : { connectionString: parsed.toString(), ...poolTuning };
}

const prisma = new PrismaClient({ adapter: new PrismaPg(getPrismaPgConfig()) });

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Could not find __NEXT_DATA__");
  return JSON.parse(match[1]);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function brandedLabel(label) {
  return String(label || "")
    .replaceAll("The Wedding Company", "Viraaya Weddings")
    .replaceAll("TWC's choice", "Viraaya's choice")
    .replaceAll("TWC’s choice", "Viraaya's choice");
}

function inferCitySlug(row) {
  return slugify(row.citySlug || row.city || String(row.shortAddress || "").split(",").pop() || "bengaluru") || "bengaluru";
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mediaFromListing(row) {
  return (row.media || []).map((item, index) => ({
    originalUrl: item.url || item.mediaUrl || item.originalUrl || "",
    localPath: null,
    mimeType: item.mimeType || "image/webp",
    mediaId: item.mediaId || null,
    source: "listing",
    position: index
  })).filter((item) => item.originalUrl);
}

function mediaFromDetail(detail) {
  return (detail.coverMedia || []).map((item, index) => ({
    originalUrl: item.mediaUrl || item.url || item.originalUrl || "",
    localPath: null,
    mimeType: item.mimeType || "image/webp",
    mediaId: item.mediaId || null,
    source: "detail",
    position: index
  })).filter((item) => item.originalUrl);
}

function dedupeMedia(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.mediaId || item.originalUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...item, position: out.length });
  }
  return out;
}

function searchText(row) {
  return [
    row.venueName,
    row.name,
    row.city,
    row.citySlug,
    row.shortAddress,
    row.formattedAddress,
    ...(row.specialTags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function decorateListingPayload(row, citySlug) {
  return {
    ...row,
    citySlug,
    specialTags: (row.specialTags || []).map(brandedLabel),
    businessCategory: "DECORATION"
  };
}

async function upsertDecorator(row, listingOrder, detailByVendorId, seoByVendorId) {
  const citySlug = inferCitySlug(row);
  const cityName = row.city || citySlug.slice(0, 1).toUpperCase() + citySlug.slice(1);
  const listingPayload = decorateListingPayload(row, citySlug);
  const detailPayload = detailByVendorId.get(row.vendorId) || null;
  const seoPayload = seoByVendorId.get(row.vendorId) || null;
  const detailMeta = detailPayload?.meta || {};
  const startsAt = numberOrNull(row.meta?.startsAt);
  const indoorPrice = numberOrNull(detailMeta.indoorPrice) ?? startsAt;
  const outdoorPrice = numberOrNull(detailMeta.outdoorPrice) ?? startsAt;
  const minDecorCost = startsAt ?? indoorPrice ?? outdoorPrice;
  const [longitude, latitude] = Array.isArray(row.coordinates) ? row.coordinates : [null, null];
  const media = dedupeMedia([...mediaFromDetail(detailPayload || {}), ...mediaFromListing(row)]);
  const tags = (row.specialTags || []).map(brandedLabel).filter(Boolean);

  await prisma.decoratorCity.upsert({
    where: { slug: citySlug },
    update: {
      name: cityName
    },
    create: {
      slug: citySlug,
      name: cityName,
      sourceCount: 0,
      importedCount: 0
    }
  });

  await prisma.decorator.upsert({
    where: { vendorId: row.vendorId },
    update: {
      name: row.venueName || detailPayload?.name || "Wedding Decorator",
      slug: row.urlSlug,
      citySlug,
      shortAddress: row.shortAddress || null,
      formattedAddress: row.formattedAddress || null,
      userRating: numberOrNull(row.userRating),
      userRatingCount: Number.isInteger(row.userRatingCount) ? row.userRatingCount : null,
      isBhPartner: !!row.isBhPartner,
      bhPartnerDealText: row.bhPartnerDealText || null,
      minDecorCost,
      indoorPrice,
      outdoorPrice,
      listingOrder,
      listingPayload,
      detailPayload,
      seoPayload,
      searchText: searchText(listingPayload),
      longitude: numberOrNull(longitude),
      latitude: numberOrNull(latitude)
    },
    create: {
      vendorId: row.vendorId,
      name: row.venueName || detailPayload?.name || "Wedding Decorator",
      slug: row.urlSlug,
      citySlug,
      shortAddress: row.shortAddress || null,
      formattedAddress: row.formattedAddress || null,
      userRating: numberOrNull(row.userRating),
      userRatingCount: Number.isInteger(row.userRatingCount) ? row.userRatingCount : null,
      isBhPartner: !!row.isBhPartner,
      bhPartnerDealText: row.bhPartnerDealText || null,
      minDecorCost,
      indoorPrice,
      outdoorPrice,
      listingOrder,
      listingPayload,
      detailPayload,
      seoPayload,
      searchText: searchText(listingPayload),
      longitude: numberOrNull(longitude),
      latitude: numberOrNull(latitude)
    }
  });

  await prisma.decoratorMedia.deleteMany({ where: { decoratorId: row.vendorId } });
  if (media.length) {
    await prisma.decoratorMedia.createMany({
      data: media.map((item) => ({
        decoratorId: row.vendorId,
        originalUrl: item.originalUrl,
        localPath: item.localPath,
        mimeType: item.mimeType,
        mediaId: item.mediaId,
        source: item.source,
        position: item.position
      }))
    });
  }

  await prisma.decoratorTag.deleteMany({ where: { decoratorId: row.vendorId } });
  if (tags.length) {
    await prisma.decoratorTag.createMany({
      data: [...new Set(tags)].map((label) => ({ decoratorId: row.vendorId, label })),
      skipDuplicates: true
    });
  }
}

async function fetchApiPage(page, limit) {
  const url = new URL(decoratorApiUrl);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      origin: "https://www.theweddingcompany.com",
      referer: "https://www.theweddingcompany.com/wedding-decorators",
      "user-agent": "Mozilla/5.0"
    }
  });
  if (!response.ok) throw new Error(`Decorator API page ${page} failed: ${response.status}`);
  return response.json();
}

async function loadDecoratorRowsFromApi() {
  const limit = Number(process.env.DECORATOR_IMPORT_LIMIT || 100);
  const first = await fetchApiPage(1, limit);
  const total = Number(first.size || first.results?.length || 0);
  const rows = [...(first.results || [])];
  const pages = Math.ceil(total / limit);

  for (let page = 2; page <= pages; page += 1) {
    const payload = await fetchApiPage(page, limit);
    rows.push(...(payload.results || []));
    if (!payload.nextPageUrl && rows.length >= total) break;
  }

  return rows;
}

function loadDecoratorRowsFromCapture() {
  const listingNextData = extractNextData(fs.readFileSync(capturedListingPath, "utf8"));
  return listingNextData.props.pageProps.initialVendorList.results || [];
}

async function loadDecoratorRows() {
  if (process.env.DECORATOR_IMPORT_SOURCE === "captured") return loadDecoratorRowsFromCapture();
  try {
    return await loadDecoratorRowsFromApi();
  } catch (error) {
    console.warn(`API import failed, falling back to captured HTML: ${error.message}`);
    return loadDecoratorRowsFromCapture();
  }
}

async function refreshCityCounts() {
  const grouped = await prisma.decorator.groupBy({
    by: ["citySlug"],
    _count: { citySlug: true }
  });
  for (const item of grouped) {
    await prisma.decoratorCity.update({
      where: { slug: item.citySlug },
      data: {
        sourceCount: item._count.citySlug,
        importedCount: item._count.citySlug
      }
    });
  }
}

async function main() {
  const rows = await loadDecoratorRows();
  const detailByVendorId = new Map();
  const seoByVendorId = new Map();

  if (fs.existsSync(capturedDetailPath)) {
    const detailNextData = extractNextData(fs.readFileSync(capturedDetailPath, "utf8"));
    const vendorDetails = detailNextData.props.pageProps.vendorDetails;
    if (vendorDetails?.vendorId) {
      detailByVendorId.set(vendorDetails.vendorId, vendorDetails);
      seoByVendorId.set(vendorDetails.vendorId, detailNextData.props.pageProps.seoMetaData || null);
    }
  }

  for (const [index, row] of rows.entries()) {
    await upsertDecorator(row, index + 1, detailByVendorId, seoByVendorId);
  }
  await refreshCityCounts();

  const count = await prisma.decorator.count();
  console.log(`Imported ${rows.length} decorator rows. Decorator table now has ${count} rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
