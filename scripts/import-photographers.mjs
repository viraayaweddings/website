import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data", "photographers");
const RAW_DIR = join(DATA_DIR, "raw");
const CITY_SLUGS = ["delhi", "gurugram", "noida", "jaipur", "udaipur"];
const LIMIT = 24;
const BASE_SITE = "https://www.theweddingcompany.com";
// The live photographer listing API (theweddingcompany.com's own backend). Page
// 1 + total count come from the TWC _next/data city page; pages 2..N paginate
// straight against this API, which returns { nextPageUrl, results } (no size).
const API_BASE =
  process.env.PHOTOGRAPHER_IMPORT_API_BASE ||
  "https://weddingapi.betterhalf.ai/v1/photography/vendors/";
const CONCURRENCY = Number(process.env.IMPORT_CONCURRENCY || 8);
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
  if (url.startsWith(API_BASE)) {
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
  const html = await fetchText(`${BASE_SITE}/wedding-photographers`);
  return extractNextData(html).buildId;
}

function cityDataUrl(buildId, citySlug) {
  return `${BASE_SITE}/_next/data/${buildId}/wedding-photographers/${citySlug}.json?city=${citySlug}`;
}

function listApiUrl(citySlug, page) {
  const qs = new URLSearchParams({
    citySlug,
    limit: String(LIMIT),
    page: String(page)
  });
  return `${API_BASE}?${qs.toString()}`;
}

function detailDataUrl(buildId, citySlug, slug) {
  const qs = new URLSearchParams({
    photographyCity: citySlug,
    photographyLocalityOrCategorySlug: slug
  });
  return `${BASE_SITE}/_next/data/${buildId}/wedding-photographers/${citySlug}/${slug}.json?${qs.toString()}`;
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

function normalizePhotographer(listing, detail, citySlug, order) {
  const vd = detail?.vendorDetails || {};
  const tags = [...new Set([...(listing.specialTags || []), ...(vd.specialTags || [])])];

  const listingImages = Array.isArray(listing.media)
    ? listing.media.map((item) => ({
        url: item.url || null,
        mimeType: item.mimeType || null,
        mediaId: item.mediaId || null,
        source: "listing"
      })).filter((item) => item.url)
    : [];

  const coverMedia = Array.isArray(vd.coverMedia)
    ? vd.coverMedia.map((item) => ({
        url: item.mediaUrl || item.compressedMediaUrl || item.url || null,
        mimeType: item.mimeType || null,
        mediaId: item.mediaId || null,
        source: "detail-cover"
      })).filter((item) => item.url)
    : [];

  const albumMedia = Array.isArray(vd.albums)
    ? vd.albums
        .flatMap((album) => (Array.isArray(album.media) ? album.media : []))
        .map((item) => ({
          url: item.mediaUrl || item.compressedMediaUrl || item.url || null,
          mimeType: item.mimeType || null,
          mediaId: item.mediaId || null,
          source: "detail-album"
        }))
        .filter((item) => item.url)
    : [];

  const seenImages = new Set();
  const images = [...listingImages, ...coverMedia, ...albumMedia].filter((item) => {
    const key = item.mediaId || item.url;
    if (!key || seenImages.has(key)) return false;
    seenImages.add(key);
    return true;
  });

  const cityName = listing.city || vd.address?.city || citySlug;
  const name = vd.name || listing.venueName;
  const shortAddress = listing.shortAddress || vd.address?.addressLocality || "";
  const formattedAddress = vd.formattedAddress || listing.formattedAddress || "";

  // startsAt is 99999999 when unset; only treat a real value as a package price.
  const rawStartsAt = numberOrNull(vd.meta?.startsAt ?? listing.meta?.startsAt);
  const startsAt =
    rawStartsAt && rawStartsAt > 0 && rawStartsAt < 99999999 ? rawStartsAt : null;

  const searchText = [
    name,
    cityName,
    shortAddress,
    formattedAddress,
    tags.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    vendorId: listing.vendorId,
    name,
    slug: listing.urlSlug,
    city: cityName,
    citySlug: listing.citySlug || citySlug,
    shortAddress,
    formattedAddress,
    userRating: numberOrNull(listing.userRating ?? vd.userRating),
    userRatingCount: numberOrNull(listing.userRatingCount ?? vd.userRatingCount),
    isBhPartner: Boolean(listing.isBhPartner || vd.bhPartnerStatus),
    bhPartnerDealText: listing.bhPartnerDealText || vd.bhPartnerDealText || null,
    tags,
    listingOrder: order,
    minPackageCost: startsAt,
    maxPackageCost: null,
    coordinates: listing.coordinates || vd.coordinates || null,
    about: vd.about || null,
    images,
    searchText,
    listingPayload: listing,
    detailPayload: vd
  };
}

async function importCity(buildId, citySlug) {
  console.log(`Fetching listings for city: ${citySlug}`);
  // Page 1 comes from the TWC city page, which is the only endpoint that
  // returns the total count + the city display name.
  const cityPage = await fetchJson(cityDataUrl(buildId, citySlug));
  const initial = cityPage.pageProps?.initialVendorList || {};
  const total = initial.size || 0;
  const pages = Math.ceil(total / LIMIT);
  const cityName = initial.results?.[0]?.city || citySlug;
  const listings = [...(initial.results || [])];
  console.log(`${citySlug}: page 1/${pages}, ${listings.length}/${total}`);

  for (let page = 2; page <= pages; page += 1) {
    const payload = await fetchJson(listApiUrl(citySlug, page));
    const pageResults = payload.results || [];
    listings.push(...pageResults);
    if (page % 10 === 0 || page === pages) {
      console.log(`${citySlug}: page ${page}/${pages}, ${listings.length}/${total}`);
    }
  }

  await writeFile(
    join(RAW_DIR, `${citySlug}-listings.json`),
    JSON.stringify({ listings, sourceCount: total, cityName }, null, 2)
  );

  return {
    citySlug,
    cityName,
    sourceCount: total,
    listings
  };
}

async function importDetails(buildId, cityImport) {
  console.log(`Fetching details: ${cityImport.citySlug}`);
  const details = await mapLimit(cityImport.listings, CONCURRENCY, async (photographer, index) => {
    const slug = photographer.urlSlug;
    const cs = photographer.citySlug || cityImport.citySlug;
    const url = detailDataUrl(buildId, cs, slug);
    try {
      const detail = await fetchJson(url);
      if ((index + 1) % 25 === 0) {
        console.log(`${cityImport.citySlug}: details ${index + 1}/${cityImport.listings.length}`);
      }
      return detail.pageProps || detail;
    } catch (error) {
      console.warn(`Detail failed ${cityImport.citySlug}/${slug}: ${error.message}`);
      return null;
    }
  });

  const byVendorId = Object.fromEntries(
    cityImport.listings.map((photographer, index) => [photographer.vendorId, details[index]])
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

  let order = 0;
  const photographers = [];
  const cities = cityImports.map((cityImport) => ({
    slug: cityImport.citySlug,
    name:
      cityImport.cityName ||
      cityImport.listings[0]?.city ||
      cityImport.citySlug.slice(0, 1).toUpperCase() + cityImport.citySlug.slice(1),
    sourceCount: cityImport.sourceCount,
    importedCount: cityImport.listings.length
  }));

  for (const cityImport of cityImports) {
    for (const listing of cityImport.listings) {
      photographers.push(
        normalizePhotographer(
          listing,
          detailMaps[cityImport.citySlug][listing.vendorId],
          cityImport.citySlug,
          order
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
    photographers
  };

  await writeFile(join(DATA_DIR, "database.json"), JSON.stringify(database));
  await writeFile(join(DATA_DIR, "database.pretty.json"), JSON.stringify(database, null, 2));
  console.log(`Done. Imported ${photographers.length} photographers.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
