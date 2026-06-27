import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const root = process.cwd();
const capturedListingPath = path.join(root, "data", "captured-company", "wedding-decorators.html");
const capturedDetailPath = path.join(root, "data", "decorators", "captured-decorator-detail.html");
const decoratorApiUrl = "https://weddingapi.betterhalf.ai/v1/decor/vendors/";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return "postgresql://postgres@localhost:55432/viraayaweddings?schema=public";
}

function getPgConfig() {
  const parsed = new URL(getDatabaseUrl());
  const sslMode = parsed.searchParams.get("sslmode");
  const usesSsl = sslMode && sslMode.toLowerCase() !== "disable";
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");
  return {
    connectionString: parsed.toString(),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
    ...(usesSsl
      ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } }
      : {})
  };
}

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
  const limit = Number(process.env.DECORATOR_IMPORT_LIMIT || 200);
  const first = await fetchApiPage(1, limit);
  const total = Number(first.size || first.results?.length || 0);
  const rows = [...(first.results || [])];
  let hasNext = !!first.nextPageUrl;
  for (let page = 2; hasNext && page <= 200; page += 1) {
    const payload = await fetchApiPage(page, limit);
    rows.push(...(payload.results || []));
    hasNext = !!payload.nextPageUrl && rows.length < total;
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

function loadDetailPayloads() {
  const detailByVendorId = new Map();
  const seoByVendorId = new Map();
  if (!fs.existsSync(capturedDetailPath)) return { detailByVendorId, seoByVendorId };
  const detailNextData = extractNextData(fs.readFileSync(capturedDetailPath, "utf8"));
  const vendorDetails = detailNextData.props.pageProps.vendorDetails;
  if (vendorDetails?.vendorId) {
    detailByVendorId.set(vendorDetails.vendorId, vendorDetails);
    seoByVendorId.set(vendorDetails.vendorId, detailNextData.props.pageProps.seoMetaData || null);
  }
  return { detailByVendorId, seoByVendorId };
}

function normalizeRow(row, listingOrder, detailByVendorId, seoByVendorId) {
  const citySlug = inferCitySlug(row);
  const listingPayload = {
    ...row,
    citySlug,
    specialTags: (row.specialTags || []).map(brandedLabel),
    businessCategory: "DECORATION"
  };
  const detailPayload = detailByVendorId.get(row.vendorId) || null;
  const seoPayload = seoByVendorId.get(row.vendorId) || null;
  const detailMeta = detailPayload?.meta || {};
  const startsAt = numberOrNull(row.meta?.startsAt);
  const indoorPrice = numberOrNull(detailMeta.indoorPrice) ?? startsAt;
  const outdoorPrice = numberOrNull(detailMeta.outdoorPrice) ?? startsAt;
  const minDecorCost = startsAt ?? indoorPrice ?? outdoorPrice;
  const [longitude, latitude] = Array.isArray(row.coordinates) ? row.coordinates : [null, null];
  const media = dedupeMedia([...mediaFromDetail(detailPayload || {}), ...mediaFromListing(row)])
    .map((item) => ({ ...item, decoratorId: row.vendorId }));
  const tags = [...new Set((row.specialTags || []).map(brandedLabel).filter(Boolean))]
    .map((label) => ({ decoratorId: row.vendorId, label }));

  return {
    city: {
      slug: citySlug,
      name: row.city || citySlug.slice(0, 1).toUpperCase() + citySlug.slice(1)
    },
    decorator: {
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
    },
    media,
    tags
  };
}

function batches(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function upsertCities(client, cities) {
  await client.query(
    `
    INSERT INTO "DecoratorCity" ("slug", "name", "sourceCount", "importedCount", "createdAt", "updatedAt")
    SELECT "slug", "name", "sourceCount", "sourceCount", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM jsonb_to_recordset($1::jsonb) AS x("slug" text, "name" text, "sourceCount" int)
    ON CONFLICT ("slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "sourceCount" = EXCLUDED."sourceCount",
      "importedCount" = EXCLUDED."importedCount",
      "updatedAt" = CURRENT_TIMESTAMP
    `,
    [JSON.stringify(cities)]
  );
}

async function upsertDecorators(client, decorators) {
  for (const batch of batches(decorators, 300)) {
    await client.query(
      `
      INSERT INTO "Decorator" (
        "vendorId", "name", "slug", "citySlug", "shortAddress", "formattedAddress",
        "userRating", "userRatingCount", "isBhPartner", "bhPartnerDealText",
        "minDecorCost", "indoorPrice", "outdoorPrice", "listingOrder",
        "listingPayload", "detailPayload", "seoPayload", "searchText",
        "longitude", "latitude", "createdAt", "updatedAt"
      )
      SELECT
        "vendorId", "name", "slug", "citySlug", "shortAddress", "formattedAddress",
        "userRating", "userRatingCount", "isBhPartner", "bhPartnerDealText",
        "minDecorCost", "indoorPrice", "outdoorPrice", "listingOrder",
        "listingPayload", "detailPayload", "seoPayload", "searchText",
        "longitude", "latitude", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM jsonb_to_recordset($1::jsonb) AS x(
        "vendorId" text, "name" text, "slug" text, "citySlug" text,
        "shortAddress" text, "formattedAddress" text, "userRating" double precision,
        "userRatingCount" int, "isBhPartner" boolean, "bhPartnerDealText" text,
        "minDecorCost" int, "indoorPrice" int, "outdoorPrice" int, "listingOrder" int,
        "listingPayload" jsonb, "detailPayload" jsonb, "seoPayload" jsonb,
        "searchText" text, "longitude" double precision, "latitude" double precision
      )
      ON CONFLICT ("vendorId") DO UPDATE SET
        "name" = EXCLUDED."name",
        "slug" = EXCLUDED."slug",
        "citySlug" = EXCLUDED."citySlug",
        "shortAddress" = EXCLUDED."shortAddress",
        "formattedAddress" = EXCLUDED."formattedAddress",
        "userRating" = EXCLUDED."userRating",
        "userRatingCount" = EXCLUDED."userRatingCount",
        "isBhPartner" = EXCLUDED."isBhPartner",
        "bhPartnerDealText" = EXCLUDED."bhPartnerDealText",
        "minDecorCost" = EXCLUDED."minDecorCost",
        "indoorPrice" = EXCLUDED."indoorPrice",
        "outdoorPrice" = EXCLUDED."outdoorPrice",
        "listingOrder" = EXCLUDED."listingOrder",
        "listingPayload" = EXCLUDED."listingPayload",
        "detailPayload" = COALESCE(EXCLUDED."detailPayload", "Decorator"."detailPayload"),
        "seoPayload" = COALESCE(EXCLUDED."seoPayload", "Decorator"."seoPayload"),
        "searchText" = EXCLUDED."searchText",
        "longitude" = EXCLUDED."longitude",
        "latitude" = EXCLUDED."latitude",
        "updatedAt" = CURRENT_TIMESTAMP
      `,
      [JSON.stringify(batch)]
    );
  }
}

async function replaceChildren(client, vendorIds, media, tags) {
  for (const batch of batches(vendorIds, 500)) {
    await client.query(`DELETE FROM "DecoratorMedia" WHERE "decoratorId" = ANY($1::text[])`, [batch]);
    await client.query(`DELETE FROM "DecoratorTag" WHERE "decoratorId" = ANY($1::text[])`, [batch]);
  }

  for (const batch of batches(media, 1000)) {
    if (!batch.length) continue;
    await client.query(
      `
      INSERT INTO "DecoratorMedia" (
        "decoratorId", "originalUrl", "localPath", "mimeType", "mediaId", "source", "position"
      )
      SELECT "decoratorId", "originalUrl", "localPath", "mimeType", "mediaId", "source", "position"
      FROM jsonb_to_recordset($1::jsonb) AS x(
        "decoratorId" text, "originalUrl" text, "localPath" text,
        "mimeType" text, "mediaId" text, "source" text, "position" int
      )
      `,
      [JSON.stringify(batch)]
    );
  }

  for (const batch of batches(tags, 1000)) {
    if (!batch.length) continue;
    await client.query(
      `
      INSERT INTO "DecoratorTag" ("decoratorId", "label")
      SELECT "decoratorId", "label"
      FROM jsonb_to_recordset($1::jsonb) AS x("decoratorId" text, "label" text)
      ON CONFLICT ("decoratorId", "label") DO NOTHING
      `,
      [JSON.stringify(batch)]
    );
  }
}

async function main() {
  const rows = await loadDecoratorRows();
  const { detailByVendorId, seoByVendorId } = loadDetailPayloads();
  const normalized = rows.map((row, index) => normalizeRow(row, index + 1, detailByVendorId, seoByVendorId));
  const cityMap = new Map();
  for (const item of normalized) {
    const current = cityMap.get(item.city.slug) || { ...item.city, sourceCount: 0 };
    current.sourceCount += 1;
    cityMap.set(item.city.slug, current);
  }

  const pool = new Pool(getPgConfig());
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await upsertCities(client, [...cityMap.values()]);
    await upsertDecorators(client, normalized.map((item) => item.decorator));
    await replaceChildren(
      client,
      normalized.map((item) => item.decorator.vendorId),
      normalized.flatMap((item) => item.media),
      normalized.flatMap((item) => item.tags)
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`Imported ${rows.length} decorator rows in bulk.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
