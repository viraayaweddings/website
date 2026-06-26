import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { execFile } from "node:child_process";
import { dirname, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data", "venues");
const RAW_DIR = join(DATA_DIR, "raw");
const PUBLIC_ASSET_DIR = join(ROOT, "public", "twc-venues-local");
const CITY_SLUGS = ["delhi", "gurugram", "noida", "jaipur", "udaipur"];
const LIMIT = 24;
const BASE_SITE = "https://www.theweddingcompany.com";
const API_BASE = "https://weddingapi.betterhalf.ai/v1/venue/vendors/";
const CONCURRENCY = Number(process.env.IMPORT_CONCURRENCY || 8);
const DOWNLOAD_ASSETS = process.env.DOWNLOAD_ASSETS !== "false";
const execFileAsync = promisify(execFile);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, tries = 4) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json,text/plain,*/*",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      await wait(500 * attempt);
    }
  }
  if (url.includes("weddingapi.betterhalf.ai")) {
    const { stdout } = await execFileAsync(
      "curl.exe",
      [
        "-L",
        "--ssl-no-revoke",
        "-H",
        "accept: application/json,text/plain,*/*",
        "-A",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        url
      ],
      { maxBuffer: 1024 * 1024 * 50 }
    );
    return JSON.parse(stdout);
  }
  throw new Error(`Failed ${url}: ${lastError?.message || lastError}`);
}

async function fetchText(url, tries = 4) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          accept: "text/html,*/*",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await wait(500 * attempt);
    }
  }
  throw new Error(`Failed ${url}: ${lastError?.message || lastError}`);
}

function extractNextData(html) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error("Missing __NEXT_DATA__ script");
  return JSON.parse(match[1]);
}

async function getBuildId() {
  const html = await fetchText(`${BASE_SITE}/wedding-venues/delhi`);
  return extractNextData(html).buildId;
}

function detailDataUrl(buildId, citySlug, venueSlug) {
  const path = `/wedding-venues/${citySlug}/${venueSlug}.json`;
  const qs = new URLSearchParams({
    venueCityOrFilter: citySlug,
    venueLocalityOrDetailOrFilter: venueSlug
  });
  return `${BASE_SITE}/_next/data/${buildId}${path}?${qs.toString()}`;
}

function cityDataUrl(buildId, citySlug) {
  return `${BASE_SITE}/_next/data/${buildId}/wedding-venues/${citySlug}.json?venueCityOrFilter=${citySlug}`;
}

function listApiUrl(citySlug, page) {
  const qs = new URLSearchParams({
    citySlug,
    limit: String(LIMIT),
    page: String(page)
  });
  return `${API_BASE}?${qs.toString()}`;
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function collectUrlValues(value, urls = new Set()) {
  if (!value) return urls;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) && /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(value)) {
      urls.add(value);
    }
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrlValues(item, urls));
    return urls;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectUrlValues(item, urls));
  }
  return urls;
}

function assetLocalPath(originalUrl) {
  const url = new URL(originalUrl);
  const rawExt = extname(url.pathname).split("?")[0];
  const ext = rawExt || ".jpg";
  const safePath = url.pathname
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9._/-]/g, "-");
  return `/twc-venues-local/${url.hostname}/${safePath}${safePath.endsWith(ext) ? "" : ext}`;
}

async function downloadAsset(originalUrl, localPath) {
  const target = join(ROOT, "public", localPath.replace(/^\//, ""));
  try {
    await readFile(target);
    return true;
  } catch {
    // continue
  }
  await mkdir(dirname(target), { recursive: true });
  const res = await fetch(originalUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${originalUrl}`);
  await pipeline(res.body, createWriteStream(target));
  return true;
}

function mediaUrl(media) {
  return media?.compressedMediaUrl || media?.mediaUrl || media?.url || media?.videoThumbnailUrl || "";
}

function normalizeVenue(listing, detail, citySlug, order, assetMap) {
  const vd = detail?.vendorDetails || {};
  const meta = { ...(listing?.meta || {}), ...(vd?.meta || {}) };
  const areas = Array.isArray(vd.areasAvailable) ? vd.areasAvailable : [];
  const amenities = [
    ...(Array.isArray(vd.amenities) ? vd.amenities : []),
    ...(Array.isArray(vd.amenitiesAvailable) ? vd.amenitiesAvailable : [])
  ];
  const facilities = Array.isArray(vd.facilities) ? vd.facilities : [];
  const tags = [...new Set([...(listing.specialTags || []), ...(vd.specialTags || [])])];
  const listingImages = Array.isArray(listing.media) ? listing.media : [];
  const coverMedia = Array.isArray(vd.coverMedia) ? vd.coverMedia : [];
  const albumMedia = Array.isArray(vd.albums)
    ? vd.albums.flatMap((album) => (Array.isArray(album.media) ? album.media : []))
    : [];
  const images = [...listingImages, ...coverMedia, ...albumMedia]
    .map((item, index) => {
      const originalUrl = mediaUrl(item);
      return originalUrl
        ? {
            originalUrl,
            url: assetMap[originalUrl] || originalUrl,
            mimeType: item.mimeType || null,
            mediaId: item.mediaId || null,
            source: index < listingImages.length ? "listing" : "detail"
          }
        : null;
    })
    .filter(Boolean);
  const cityName = listing.city || vd.address?.city || citySlug;
  const searchText = [
    listing.venueName,
    vd.name,
    listing.shortAddress,
    listing.formattedAddress,
    vd.formattedAddress,
    cityName,
    listing.citySlug,
    tags.join(" "),
    vd.venueType,
    vd.vsVenueType,
    areas.map((area) => [area.name, area.areaName, area.type].filter(Boolean).join(" ")).join(" "),
    amenities.map((item) => item.name || item.title || item.label || item).join(" "),
    facilities.map((item) => item.name || item.title || item.label || item).join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    vendorId: listing.vendorId,
    name: vd.name || listing.venueName,
    slug: listing.urlSlug,
    city: cityName,
    citySlug: listing.citySlug || citySlug,
    shortAddress: listing.shortAddress || vd.address?.addressLocality || "",
    formattedAddress: vd.formattedAddress || listing.formattedAddress || "",
    userRating: numberOrNull(listing.userRating ?? vd.userRating),
    userRatingCount: numberOrNull(listing.userRatingCount ?? vd.userRatingCount),
    isBhPartner: Boolean(listing.isBhPartner || vd.bhPartnerStatus),
    bhPartnerDealText: listing.bhPartnerDealText || vd.bhPartnerDealText || null,
    tags,
    listingOrder: order,
    price: {
      perPlate: meta.perPlateCost || null,
      perDay: meta.perDayCost || null
    },
    capacity: meta.areasAvailable || null,
    rooms: meta.roomCount || null,
    parkingCount: numberOrNull(meta.parkingCount),
    coordinates: listing.coordinates || vd.coordinates || null,
    venueType: vd.venueType || vd.vsVenueType || null,
    areasAvailable: areas,
    amenities,
    facilities,
    about: vd.about || null,
    images,
    searchText
  };
}

async function importCity(buildId, citySlug) {
  console.log(`Fetching city page: ${citySlug}`);
  const cityPage = await fetchJson(cityDataUrl(buildId, citySlug));
  const initial = cityPage.pageProps.initialVendorList;
  const total = initial.size || 0;
  const pages = Math.ceil(total / LIMIT);
  const listings = [];
  for (let page = 1; page <= pages; page += 1) {
    const payload = page === 1 ? initial : await fetchJson(listApiUrl(citySlug, page));
    const pageResults = payload.results || [];
    listings.push(...pageResults);
    console.log(`${citySlug}: page ${page}/${pages}, ${listings.length}/${total}`);
  }
  await writeFile(
    join(RAW_DIR, `${citySlug}-listings.json`),
    JSON.stringify({ cityPage, listings }, null, 2)
  );
  return {
    citySlug,
    cityPage,
    sourceCount: total,
    listings
  };
}

async function importDetails(buildId, cityImport) {
  console.log(`Fetching details: ${cityImport.citySlug}`);
  const details = await mapLimit(cityImport.listings, CONCURRENCY, async (venue, index) => {
    const url = detailDataUrl(buildId, venue.citySlug || cityImport.citySlug, venue.urlSlug);
    try {
      const detail = await fetchJson(url);
      if ((index + 1) % 25 === 0) {
        console.log(`${cityImport.citySlug}: details ${index + 1}/${cityImport.listings.length}`);
      }
      return detail.pageProps || detail;
    } catch (error) {
      console.warn(`Detail failed ${cityImport.citySlug}/${venue.urlSlug}: ${error.message}`);
      return null;
    }
  });
  const byVendorId = Object.fromEntries(
    cityImport.listings.map((venue, index) => [venue.vendorId, details[index]])
  );
  await writeFile(
    join(RAW_DIR, `${cityImport.citySlug}-details.json`),
    JSON.stringify(byVendorId, null, 2)
  );
  return byVendorId;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(PUBLIC_ASSET_DIR, { recursive: true });

  const buildId = await getBuildId();
  console.log(`Build id: ${buildId}`);

  const cityImports = [];
  for (const citySlug of CITY_SLUGS) {
    cityImports.push(await importCity(buildId, citySlug));
  }

  const detailMaps = {};
  for (const cityImport of cityImports) {
    detailMaps[cityImport.citySlug] = await importDetails(buildId, cityImport);
  }

  const assetUrls = new Set();
  for (const cityImport of cityImports) {
    for (const listing of cityImport.listings) {
      collectUrlValues(listing, assetUrls);
      collectUrlValues(detailMaps[cityImport.citySlug][listing.vendorId], assetUrls);
    }
  }
  const assetMap = Object.fromEntries([...assetUrls].map((url) => [url, assetLocalPath(url)]));
  await writeFile(join(DATA_DIR, "asset-map.json"), JSON.stringify(assetMap, null, 2));

  if (DOWNLOAD_ASSETS) {
    const entries = Object.entries(assetMap);
    console.log(`Downloading ${entries.length} image assets`);
    await mapLimit(entries, CONCURRENCY, async ([originalUrl, localPath], index) => {
      try {
        await downloadAsset(originalUrl, localPath);
      } catch (error) {
        console.warn(`Asset failed ${originalUrl}: ${error.message}`);
      }
      if ((index + 1) % 100 === 0) {
        console.log(`assets ${index + 1}/${entries.length}`);
      }
    });
  }

  let order = 0;
  const venues = [];
  const cities = cityImports.map((cityImport) => ({
    slug: cityImport.citySlug,
    name:
      cityImport.listings[0]?.city ||
      cityImport.citySlug.slice(0, 1).toUpperCase() + cityImport.citySlug.slice(1),
    sourceCount: cityImport.sourceCount,
    importedCount: cityImport.listings.length,
    seoPayload: {
      categorySEO: cityImport.cityPage.pageProps.categorySEO || null,
      categoryAbout: cityImport.cityPage.pageProps.categoryAbout || null,
      seoFooterDetails: cityImport.cityPage.pageProps.seoFooterDetails || null
    }
  }));

  for (const cityImport of cityImports) {
    for (const listing of cityImport.listings) {
      venues.push(
        normalizeVenue(
          listing,
          detailMaps[cityImport.citySlug][listing.vendorId],
          cityImport.citySlug,
          order,
          assetMap
        )
      );
      order += 1;
    }
  }

  const database = {
    generatedAt: new Date().toISOString(),
    sourceBuildId: buildId,
    limit: LIMIT,
    source: BASE_SITE,
    cities,
    venues
  };

  await writeFile(join(DATA_DIR, "database.json"), JSON.stringify(database));
  await writeFile(join(DATA_DIR, "database.pretty.json"), JSON.stringify(database, null, 2));
  console.log(`Done. Imported ${venues.length} venues.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
