import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import {
  applyBranding,
  applyHomepageHeaderFooter,
  injectHomepageShellSupport
} from "../homepage-shell";

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
  ["https://maps.gstatic.com", "/venue-assets/maps"]
];

const LOCAL_ALIASES: Array<[string, string]> = [
  ["/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages"],
  ["/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding"],
  ["/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
  ["/twc-venues-local/maps.gstatic.com", "/venue-assets/maps"]
];

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

function num(v: unknown): number | null {
  return typeof v === "number" ? v : v == null ? null : Number(v) || 0;
}

function metaFor(row: any) {
  return {
    perPlateCost: { maxValue: row.maxPerPlateCost ?? 0, minValue: row.minPerPlateCost ?? 0 },
    perDayCost: { maxValue: row.maxPerDayCost ?? 0, minValue: row.minPerDayCost ?? 0 },
    parkingCount: row.parkingCount ?? 0,
    roomCount: { maxValue: row.maxRoomCount ?? 0, minValue: row.minRoomCount ?? 0 },
    areasAvailable: { minValue: row.minAreaCapacity ?? 0, maxValue: row.maxAreaCapacity ?? 0 }
  };
}

function coverMediaFor(media: any[]) {
  return media.map((m) => ({
    mediaUrl: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl),
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
  vd.coverMedia = coverMediaFor(media);
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
    return {
      vendorId: row.vendorId,
      urlSlug: row.slug,
      media: media.map((m) => ({
        url: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl),
        mimeType: m.mimeType || "image/webp",
        mediaId: m.mediaId,
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
  const c = decodeURIComponent(citySlug).trim().toLowerCase();
  const s = decodeURIComponent(slug).trim().toLowerCase();
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
    ["/twc-venues-local/gcpimages." + oldDomain, "/venue-assets/gcpimages"],
    ["/twc-venues-local/imageswedding." + oldDomain, "/venue-assets/imageswedding"]
  ];

  const rewrite = (value) => {
    if (!value || typeof value !== "string") return value;
    let next = value;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
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
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" || mutation.type === "characterData") patchNode(mutation.target);
      mutation.addedNodes.forEach(patchTree);
    }
  }).observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true
  });
  // React hydrates the captured bundle after this script runs and re-renders its
  // own header/footer; sweep again as it settles so branding always wins.
  [120, 400, 1000, 2500, 5000].forEach((t) => setTimeout(sweep, t));
})();
</script>`;

// Inject the local Leaflet CSS + the enhancer that wires the Similar Venues
// slider arrows and renders the nearby-venues map.
function injectEnhancer(html: string): string {
  const head =
    '<link rel="stylesheet" href="/twc-mirror/vendor/leaflet/leaflet.css"/>';
  const script = '<script src="/twc-mirror/venue-enhancer.js" defer></script>';
  let out = html.includes("</head>") ? html.replace("</head>", head + "</head>") : html;
  out = out.includes("</body>") ? out.replace("</body>", script + "</body>") : out;
  return out;
}

// Replace the captured __NEXT_DATA__ block with DB-driven data for `row`.
function injectNextData(html: string, nextData: any): string {
  const open = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(open);
  if (start === -1) return html;
  const contentStart = start + open.length;
  const end = html.indexOf("</script>", contentStart);
  const json = JSON.stringify(nextData).replace(/</g, "\\u003c");
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
  html = injectNextData(html, base);
  html = applyHomepageHeaderFooter(html);
  html = localizeAssetPaths(html);
  html = applyBranding(html);
  html = injectEnhancer(html);
  html = injectHomepageShellSupport(html);
  return html.replace("</body>", `${BRAND_RUNTIME_SCRIPT}</body>`);
}

// Cache the rendered detail HTML so hot pages never touch Neon. Cloned data is
// static, so a long revalidate keeps DB hits to ~once/day/page.
const getMirrorHtmlCached = unstable_cache(getMirrorHtmlUncached, ["venue-mirror-html-brand-gold-v2"], {
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
