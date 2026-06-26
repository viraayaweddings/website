import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data", "venues");
const RAW_DIR = join(DATA_DIR, "raw");
const CITY_SLUGS = ["delhi", "gurugram", "noida", "jaipur", "udaipur"];

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function mediaUrl(media) {
  return media?.compressedMediaUrl || media?.mediaUrl || media?.url || media?.videoThumbnailUrl || "";
}

function asTextItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => item?.name || item?.title || item?.label || item?.amenityName || item?.facilityName || item)
    .filter(Boolean);
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
    asTextItems(amenities).join(" "),
    asTextItems(facilities).join(" ")
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

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const assetMap = await readJson(join(DATA_DIR, "asset-map.json")).catch(() => ({}));
  const cities = [];
  const venues = [];
  let order = 0;

  for (const citySlug of CITY_SLUGS) {
    const { cityPage, listings } = await readJson(join(RAW_DIR, `${citySlug}-listings.json`));
    const detailMap = await readJson(join(RAW_DIR, `${citySlug}-details.json`));
    cities.push({
      slug: citySlug,
      name: listings[0]?.city || citySlug.slice(0, 1).toUpperCase() + citySlug.slice(1),
      sourceCount: cityPage.pageProps.initialVendorList.size,
      importedCount: listings.length,
      seoPayload: {
        categorySEO: cityPage.pageProps.categorySEO || null,
        categoryAbout: cityPage.pageProps.categoryAbout || null,
        seoFooterDetails: cityPage.pageProps.seoFooterDetails || null
      }
    });
    for (const listing of listings) {
      venues.push(normalizeVenue(listing, detailMap[listing.vendorId], citySlug, order, assetMap));
      order += 1;
    }
  }

  const database = {
    generatedAt: new Date().toISOString(),
    limit: 24,
    source: "https://www.theweddingcompany.com",
    cities,
    venues
  };
  await writeFile(join(DATA_DIR, "database.json"), JSON.stringify(database));
  await writeFile(join(DATA_DIR, "database.pretty.json"), JSON.stringify(database, null, 2));
  console.log(`Built database with ${venues.length} venues.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
