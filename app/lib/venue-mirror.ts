import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { isAllowedCitySlug, normalizeCitySlug, safeDecodeURIComponent } from "./allowed-cities";
import { prisma } from "./prisma";
import { localPublicImageExists } from "./asset-resolver";
import { serializeForScript } from "./script-json";
import { rewriteHeadSeo } from "./head-seo";
import {
  applyBranding,
  applyHomepageHeaderFooter,
  injectHomepageShellSupport
} from "../homepage-shell";
import {
  PRICING_RUNTIME_SCRIPT,
  sanitizePricingData,
  sanitizePricingMarkup
} from "./pricing-sanitizer";

// Mirrors theweddingcompany.com's own venue page: the original compiled HTML +
// vendored JS/CSS/fonts/media are served entirely from the local server, and
// the page data (__NEXT_DATA__) is rebuilt from the local Prisma DB so every
// venue renders through the original components with zero live dependency.

let cachedTemplate: string | null = null;
let cachedNextData: any = null;

function getTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = fs.readFileSync(
    path.join(process.cwd(), "data", "venues", "captured-venue-detail.html"),
    "utf8"
  );
  return cachedTemplate;
}

function getBaseNextData(): any {
  if (cachedNextData) return JSON.parse(JSON.stringify(cachedNextData));
  const html = getTemplate();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  cachedNextData = JSON.parse(m![1]);
  return JSON.parse(JSON.stringify(cachedNextData));
}

const LOCAL_HOSTS: Array<[string, string]> = [
  ["https://gcpimages.theweddingcompany.com", "/venue-assets/gcpimages"],
  ["https://imageswedding.theweddingcompany.com", "/venue-assets/imageswedding"],
  ["https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
  ["https://storage.googleapis.com", "/venue-assets/storage"],
  ["https://maps.gstatic.com", "/venue-assets/maps"],
  ["https://cdn.prod.website-files.com", "/venue-assets/webflowcdn"],
  ["https://assets-global.website-files.com", "/venue-assets/webflowassets"]
];

const LOCAL_ALIASES: Array<[string, string]> = [
  ["/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages"],
  ["/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding"],
  ["/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
  ["/twc-venues-local/storage.googleapis.com", "/venue-assets/storage"],
  ["/twc-venues-local/maps.gstatic.com", "/venue-assets/maps"],
  ["/twc-venues-local/cdn.prod.website-files.com", "/venue-assets/webflowcdn"],
  ["/twc-venues-local/assets-global.website-files.com", "/venue-assets/webflowassets"]
];
const VENUE_IMAGE_FALLBACKS = [
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
const RENDERABLE_IMAGE_PATH_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

function aliasLocalAssetPaths(value: string) {
  let next = value;
  for (const [oldPath, alias] of LOCAL_ALIASES) {
    next = next.split(oldPath).join(alias);
  }
  return next;
}

function localizeUrl(url: string | null | undefined): string {
  if (!url) return url || "";
  url = aliasLocalAssetPaths(url);
  for (const [live, local] of LOCAL_HOSTS) {
    if (url.startsWith(live)) return local + url.slice(live.length);
  }
  return url;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackVenueImages(seed: string, count = 8) {
  const start = hashString(seed) % VENUE_IMAGE_FALLBACKS.length;
  return Array.from({ length: Math.min(count, VENUE_IMAGE_FALLBACKS.length) }, (_, index) =>
    VENUE_IMAGE_FALLBACKS[(start + index) % VENUE_IMAGE_FALLBACKS.length]
  );
}

function hasDeployableImage(publicPath: string) {
  return RENDERABLE_IMAGE_PATH_PATTERN.test(publicPath) && localPublicImageExists(publicPath);
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : v == null ? null : Number(v) || 0;
}

function metaFor(row: any) {
  return {
    perPlateCost: { maxValue: null, minValue: null },
    perDayCost: { maxValue: null, minValue: null },
    parkingCount: row.parkingCount ?? 0,
    roomCount: { maxValue: row.maxRoomCount ?? 0, minValue: row.minRoomCount ?? 0 },
    areasAvailable: { minValue: row.minAreaCapacity ?? 0, maxValue: row.maxAreaCapacity ?? 0 }
  };
}

function coverMediaFor(media: any[], seed: string) {
  const items = media
    .map((m) => ({
      ...m,
      mediaUrl: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl)
    }))
    .filter((m) => hasDeployableImage(m.mediaUrl));

  const mediaItems = items.length
    ? items
    : fallbackVenueImages(seed).map((url) => ({
        mediaUrl: url,
        mediaId: null,
        mimeType: /\.jpe?g(?:\?|$)/i.test(url) ? "image/jpeg" : "image/webp"
      }));

  return mediaItems.map((m) => ({
    mediaUrl: m.mediaUrl,
    alt: "",
    mediaId: m.mediaId,
    mimeType: m.mimeType || "image/webp",
    compressedMediaUrl: null,
    videoThumbnailUrl: null
  }));
}

function withIdLabel(items: any[]): Array<{ id: string; label: string }> {
  return items.map((it, i) =>
    typeof it === "object" && it
      ? { id: String(it.id ?? i), label: String(it.label ?? it.name ?? "") }
      : { id: String(i), label: String(it) }
  );
}

function buildVendorDetails(base: any, row: any) {
  const dp = (row.detailPayload || {}) as Record<string, any>;
  const lp = (row.listingPayload || {}) as Record<string, any>;
  const media = [...(row.media || [])].sort((a, b) => a.position - b.position);
  const vd = { ...base.props.pageProps.vendorDetails };

  vd.vendorId = row.vendorId;
  vd.name = row.name;
  vd.userRating = num(row.userRating);
  vd.userRatingCount = row.userRatingCount ?? null;
  vd.formattedAddress = row.formattedAddress || "";
  vd.imagesCount = media.filter((m) => (m.mimeType || "").startsWith("image")).length || media.length;
  vd.videosCount = 0;
  vd.coverMedia = coverMediaFor(media, row.vendorId);
  vd.meta = metaFor(row);
  vd.about = dp.about ?? lp.about ?? { ops: [] };
  vd.areasAvailable = dp.areasAvailable ?? lp.areasAvailable ?? [];
  vd.amenities = withIdLabel((row.amenities || []).map((a: any) => a.label));
  vd.facilities = withIdLabel((row.facilities || []).map((f: any) => f.label));
  vd.urlSlug = row.slug;
  vd.bhPartnerStatus = !!row.isBhPartner;
  vd.bhPartnerDealText = row.bhPartnerDealText ?? null;
  vd.coordinates =
    row.longitude != null && row.latitude != null ? [row.longitude, row.latitude] : vd.coordinates;
  vd.venueType = dp.venueType ?? lp.venueType ?? vd.venueType;
  vd.specialTags = [];
  vd.weddingPlannerTags = [];
  vd.albums = [];
  vd.matterportUrl = null;
  vd.address = JSON.stringify({
    city: row.city?.name || row.citySlug,
    cityGroup: row.city?.name || row.citySlug,
    addressLocality: (row.shortAddress || "").split(",")[0] || "",
    postalCode: ""
  });
  return vd;
}

function buildSimilar(rows: any[]) {
  return rows.map((row) => {
    const media = [...(row.media || [])].sort((a, b) => a.position - b.position).slice(0, 4);
    const deployableMedia = media
      .map((m) => ({
        url: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl),
        mimeType: m.mimeType || "image/webp",
        mediaId: m.mediaId,
        compressedMediaUrl: null
      }))
      .filter((m) => hasDeployableImage(m.url));
    return {
      vendorId: row.vendorId,
      urlSlug: row.slug,
      media: deployableMedia.length
        ? deployableMedia
        : fallbackVenueImages(row.vendorId, 4).map((url) => ({
            url,
            mimeType: /\.jpe?g(?:\?|$)/i.test(url) ? "image/jpeg" : "image/webp",
            mediaId: null,
            compressedMediaUrl: null
          })),
      venueName: row.name,
      formattedAddress: row.formattedAddress || "",
      city: row.city?.name || row.citySlug,
      citySlug: row.citySlug,
      shortAddress: row.shortAddress || "",
      userRating: num(row.userRating),
      meta: metaFor(row),
      sort_by_status: 1,
      specialTags: [],
      isBhPartner: !!row.isBhPartner,
      bhPartnerDealText: row.bhPartnerDealText ?? null,
      userRatingCount: row.userRatingCount ?? null,
      coordinates: row.longitude != null && row.latitude != null ? [row.longitude, row.latitude] : null
    };
  });
}

const VENUE_INCLUDE = {
  city: true,
  media: true,
  tags: true,
  areas: true,
  amenities: true,
  facilities: true
} as const;

async function findVenue(citySlug: string, slug: string) {
  const c = normalizeCitySlug(citySlug);
  if (!isAllowedCitySlug(c)) return null;
  const s = safeDecodeURIComponent(slug).trim().toLowerCase();
  const exact = await prisma.venue.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { equals: s, mode: "insensitive" } },
    include: VENUE_INCLUDE
  });
  if (exact) return exact;
  return prisma.venue.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { contains: s, mode: "insensitive" } },
    include: VENUE_INCLUDE
  });
}

// Inject Next assetPrefix so dynamically-imported chunks load from the mirror.
function injectAssetPrefix(html: string): string {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const idx = html.indexOf(marker);
  if (idx === -1) return html;
  const jsonStart = idx + marker.length;
  if (html.slice(jsonStart, jsonStart + 1) !== "{") return html;
  return html.slice(0, jsonStart + 1) + '"assetPrefix":"/twc-mirror",' + html.slice(jsonStart + 1);
}

function localizeAssetPaths(html: string): string {
  let out = html.split("/_next/").join("/twc-mirror/_next/");
  for (const [live, local] of LOCAL_HOSTS) out = out.split(live).join(local);
  return aliasLocalAssetPaths(out);
}

const VENUE_STATIC_ASSET_ALIASES: Array<[string, string]> = [
  [
    "/venue-assets/gcpimages/weddings/assets/vendor_promotion.webp",
    "/twc-mirror/_next/static/media/Promotion.757e6a61.webp"
  ],
  [
    "/venue-assets/gcpimages/weddings/assets/testimonial_border.png",
    "/twc-mirror/_next/static/media/TestimonialBorder.22703fa1.png"
  ]
];

function normalizeVenueStaticAssets(html: string): string {
  let out = html;
  for (const [from, to] of VENUE_STATIC_ASSET_ALIASES) {
    out = out.split(from).join(to);
  }
  return out;
}

function stripExternalRuntime(html: string) {
  const trackingPattern = /googletagmanager|clarity\.ms|posthog/i;

  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => {
      const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] || "";
      if (/^https?:\/\//i.test(src)) return "";
      return !src && trackingPattern.test(tag) ? "" : tag;
    })
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (tag) =>
      trackingPattern.test(tag) ? "" : tag
    )
    .replace(/<iframe\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][\s\S]*?<\/iframe>/gi, "");
}

function insertBeforeClosingBody(html: string, snippet: string) {
  const index = html.lastIndexOf("</body>");
  return index === -1
    ? `${html}${snippet}`
    : `${html.slice(0, index)}${snippet}${html.slice(index)}`;
}

const BRAND_RUNTIME_SCRIPT = `
<script id="viraaya-runtime-branding">
(() => {
  const oldName = "The Wedding " + "Company";
  const oldHost = "www." + "thewedding" + "company" + ".com";
  const oldDomain = "thewedding" + "company" + ".com";
  const oldSite = "https://" + oldHost;
  const oldAbbr = "TW" + "C";
  const replacements = [
    [oldName + " logo", "Viraaya Weddings logo"],
    [oldName + " Logo", "Viraaya Weddings logo"],
    [oldName, "Viraaya Weddings"],
    ["support@" + oldDomain, "support@viraayaweddings.com"],
    ["@TheWeddingCmpny", "@viraayaweddings"],
    [oldAbbr + " Client Terms", "Viraaya Client Terms"],
    [oldAbbr + " Vendor Terms", "Viraaya Vendor Terms"],
    [oldAbbr + " Partner", "Viraaya Partner"],
    [oldAbbr + "'s choice", "Viraaya's choice"],
    [oldAbbr + "’s choice", "Viraaya’s choice"],
    ["/twc-client-terms", "/client-terms"],
    ["/twc-vendor-terms", "/vendor-terms"],
    ["/twc-privacy-policy", "/privacy-policy"],
    ["/twc-refund-policy", "/refund-policy"],
    [oldSite, "https://viraayaweddings.com"],
    ["http://" + oldHost, "https://viraayaweddings.com"],
    [oldHost, "viraayaweddings.com"],
    ["/twc-mirror/_next/static/media/TheWedding" + "CompanyLogo_Low_Res.88e6d171.webp", "/brand/viraaya-logo-header.png"],
    ["/_next/static/media/TheWedding" + "CompanyLogo_Low_Res.88e6d171.webp", "/brand/viraaya-logo-header.png"],
    ["/twc-mirror/_next/static/media/TheWedding" + "CompanyLogoVertical.b80524ce.webp", "/brand/viraaya-logo-full.png"],
    ["/_next/static/media/TheWedding" + "CompanyLogoVertical.b80524ce.webp", "/brand/viraaya-logo-full.png"],
    ["https://gcpimages." + oldDomain, "/venue-assets/gcpimages"],
    ["https://imageswedding." + oldDomain, "/venue-assets/imageswedding"],
    ["https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
    ["https://storage.googleapis.com", "/venue-assets/storage"],
    ["https://maps.gstatic.com", "/venue-assets/maps"],
    ["https://cdn.prod.website-files.com", "/venue-assets/webflowcdn"],
    ["https://assets-global.website-files.com", "/venue-assets/webflowassets"],
    ["/twc-venues-local/gcpimages." + oldDomain, "/venue-assets/gcpimages"],
    ["/twc-venues-local/imageswedding." + oldDomain, "/venue-assets/imageswedding"]
  ];

  const rewrite = (value) => {
    if (!value || typeof value !== "string") return value;
    let next = value;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    while (next.includes("/twc-mirror/twc-mirror/")) {
      next = next.split("/twc-mirror/twc-mirror/").join("/twc-mirror/");
    }
    if (next.startsWith("/_next/static/media/")) next = "/twc-mirror" + next;
    return next;
  };

  const patchNode = (node) => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = rewrite(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of Array.from(node.attributes || [])) {
      const next = rewrite(attr.value);
      if (next !== attr.value) node.setAttribute(attr.name, next);
    }
    if (node.matches && node.matches('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]')) {
      if (node.getAttribute("href") !== "/brand/favicon.png") node.setAttribute("href", "/brand/favicon.png");
      if (node.getAttribute("rel") === "icon" && node.getAttribute("type") !== "image/png") node.setAttribute("type", "image/png");
    }
  };

  const patchTree = (root) => {
    patchNode(root);
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("*").forEach(patchNode);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(patchNode);
  };

  const sweep = () => patchTree(document.documentElement);
  sweep();
  // React hydrates the captured bundle after this script runs and re-renders its
  // own header/footer; sweep again as it settles so branding always wins.
  [120, 400, 1000, 2500, 5000].forEach((t) => setTimeout(sweep, t));
  window.addEventListener("pageshow", sweep, { once: true });
})();
</script>`;

// Inject the local Leaflet CSS + the enhancer that wires the Similar Venues
// slider arrows and renders the nearby-venues map.
function injectEnhancer(html: string): string {
  const head =
    '<link rel="stylesheet" href="/twc-mirror/vendor/leaflet/leaflet.css"/>';
  const script = '<script src="/twc-mirror/venue-enhancer.js" defer></script>';
  let out = html.includes("</head>") ? html.replace("</head>", head + "</head>") : html;
  return insertBeforeClosingBody(out, script);
}

// Replace the captured __NEXT_DATA__ block with DB-driven data for `row`.
function injectNextData(html: string, nextData: any): string {
  const open = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(open);
  if (start === -1) return html;
  const contentStart = start + open.length;
  const end = html.indexOf("</script>", contentStart);
  const json = serializeForScript(nextData);
  return html.slice(0, contentStart) + json + html.slice(end);
}

async function getMirrorHtmlUncached(citySlug: string, slug: string): Promise<string | null> {
  const row = await findVenue(citySlug, slug);
  if (!row) return null;

  const base = getBaseNextData();
  const similarRows = await prisma.venue.findMany({
    where: { citySlug: row.citySlug, NOT: { vendorId: row.vendorId } },
    include: VENUE_INCLUDE,
    orderBy: [{ isBhPartner: "desc" }, { userRating: "desc" }, { listingOrder: "asc" }],
    take: 10
  });

  base.props.pageProps.vendorDetails = buildVendorDetails(base, row);
  base.props.pageProps.similarVenueList = buildSimilar(similarRows);
  base.props.pageProps.venueCityOrFilter = row.citySlug;
  base.props.pageProps.venueLocalityOrDetailOrFilter = row.slug;
  base.query = { venueCityOrFilter: row.citySlug, venueLocalityOrDetailOrFilter: row.slug };
  base.assetPrefix = "/twc-mirror";

  let html = getTemplate();
  html = injectNextData(html, sanitizePricingData(base));
  html = applyHomepageHeaderFooter(html);
  html = localizeAssetPaths(html);
  html = normalizeVenueStaticAssets(html);
  html = stripExternalRuntime(html);
  html = applyBranding(html);
  html = injectEnhancer(html);
  html = injectHomepageShellSupport(html);
  html = sanitizePricingMarkup(html);
  const cityName = row.city?.name || row.citySlug;
  html = rewriteHeadSeo(html, {
    title: `${row.name}, ${cityName} - Wedding Venue Photos`,
    description: `${row.name} in ${cityName}. View photos, seating capacity, amenities and details, and enquire online with Viraaya Weddings.`
  });
  return insertBeforeClosingBody(html, `${PRICING_RUNTIME_SCRIPT}${BRAND_RUNTIME_SCRIPT}`);
}

// Cache the rendered detail HTML so hot pages never touch Neon. Cloned data is
// static, so a long revalidate keeps DB hits to ~once/day/page.
const getMirrorHtmlCached = unstable_cache(getMirrorHtmlUncached, ["venue-mirror-html-brand-gold-v30-per-vendor-seo"], {
  revalidate: 86400,
  tags: ["venues"]
});

export async function getMirrorHtml(citySlug: string, slug: string): Promise<string | null> {
  try {
    return await getMirrorHtmlCached(citySlug, slug);
  } catch (error) {
    console.error("[venue-mirror] getMirrorHtml failed", error);
    return null;
  }
}

// Exported for potential reuse / tests.
export { injectAssetPrefix };
