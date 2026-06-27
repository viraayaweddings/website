import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

// Mirrors theweddingcompany.com's own photographer detail page: the captured
// compiled HTML + vendored JS/CSS/fonts/media are served entirely from the
// local server, and the page data (__NEXT_DATA__) is rebuilt from the local
// Prisma DB so every photographer renders through the original components with
// zero live dependency.

let cachedTemplate: string | null = null;
let cachedNextData: any = null;

function getTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = fs.readFileSync(
    path.join(process.cwd(), "data", "photographers", "captured-photographer-detail.html"),
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

// Recursively localize every CDN URL string inside an arbitrary value so the
// stored detail payload renders entirely from the local mirror.
function localizeDeep(value: any): any {
  if (typeof value === "string") return localizeUrl(value);
  if (Array.isArray(value)) return value.map(localizeDeep);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) out[key] = localizeDeep(item);
    return out;
  }
  return value;
}

// The stored detailPayload IS theweddingcompany's own vendorDetails object, so
// we use it directly (preserving the exact shape its React components expect)
// and only localize asset URLs + override the few DB-authoritative fields.
function buildPhotographerDetails(base: any, row: any) {
  const dp = row.detailPayload && typeof row.detailPayload === "object" ? row.detailPayload : {};
  const lp = row.listingPayload && typeof row.listingPayload === "object" ? row.listingPayload : {};
  const baseVd = (base.props?.pageProps?.vendorDetails || {}) as Record<string, any>;
  const hasDetail = dp && (dp.name || dp.coverMedia || dp.about || dp.meta);
  const vd = localizeDeep({ ...baseVd, ...(hasDetail ? dp : lp) });

  vd.vendorId = row.vendorId;
  vd.name = row.name;
  vd.urlSlug = row.slug;
  vd.formattedAddress = row.formattedAddress || vd.formattedAddress || "";
  vd.userRating = num(row.userRating);
  vd.userRatingCount = row.userRatingCount ?? null;
  vd.bhPartnerStatus = !!row.isBhPartner;
  vd.bhPartnerDealText = row.bhPartnerDealText ?? null;
  if (row.longitude != null && row.latitude != null) {
    vd.coordinates = [row.longitude, row.latitude];
  }

  // Prefer DB media (ordered, deduped at import) for the gallery when present.
  const media = [...(row.media || [])].sort((a: any, b: any) => a.position - b.position);
  if (media.length) vd.coverMedia = coverMediaFor(media);

  return vd;
}

function buildSimilarPhotographers(rows: any[]) {
  return rows.map((row) => {
    const media = [...(row.media || [])].sort((a: any, b: any) => a.position - b.position).slice(0, 4);
    return {
      vendorId: row.vendorId,
      urlSlug: row.slug,
      media: media.map((m: any) => ({
        url: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl),
        mimeType: m.mimeType || "image/webp",
        mediaId: m.mediaId,
        compressedMediaUrl: null
      })),
      name: row.name,
      formattedAddress: row.formattedAddress || "",
      citySlug: row.citySlug,
      userRating: num(row.userRating),
      userRatingCount: row.userRatingCount ?? null,
      isBhPartner: !!row.isBhPartner,
      bhPartnerDealText: row.bhPartnerDealText ?? null,
      sort_by_status: 1
    };
  });
}

const PHOTOGRAPHER_INCLUDE = {
  media: {
    orderBy: { position: "asc" as const }
  }
} as const;

async function findPhotographer(citySlug: string, slug: string) {
  const c = decodeURIComponent(citySlug).trim().toLowerCase();
  const s = decodeURIComponent(slug).trim().toLowerCase();
  const exact = await (prisma as any).photographer.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { equals: s, mode: "insensitive" } },
    include: PHOTOGRAPHER_INCLUDE
  });
  if (exact) return exact;
  return (prisma as any).photographer.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { contains: s, mode: "insensitive" } },
    include: PHOTOGRAPHER_INCLUDE
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
  const row = await findPhotographer(citySlug, slug);
  if (!row) return null;

  const base = getBaseNextData();
  const similarRows = await (prisma as any).photographer.findMany({
    where: { citySlug: row.citySlug, NOT: { vendorId: row.vendorId } },
    include: PHOTOGRAPHER_INCLUDE,
    orderBy: [{ isBhPartner: "desc" }, { userRating: "desc" }],
    take: 8
  });

  base.props = base.props || {};
  base.props.pageProps = base.props.pageProps || {};
  base.props.pageProps.vendorDetails = buildPhotographerDetails(base, row);
  base.props.pageProps.similarPhotographerList = buildSimilarPhotographers(similarRows);
  base.props.pageProps.citySlug = row.citySlug;
  base.props.pageProps.slug = row.slug;
  base.query = { citySlug: row.citySlug, slug: row.slug };
  base.assetPrefix = "/twc-mirror";

  let html = getTemplate();
  html = injectNextData(html, base);
  html = localizeAssetPaths(html);
  return html;
}

// Cache the fully-rendered detail HTML so a hot page never touches Neon. The
// cloned data is static, so a long revalidate keeps DB hits to ~once/day/page.
const getMirrorHtmlCached = unstable_cache(getMirrorHtmlUncached, ["photographer-mirror-html"], {
  revalidate: 86400,
  tags: ["photographers"]
});

export async function getMirrorHtml(citySlug: string, slug: string): Promise<string | null> {
  try {
    return await getMirrorHtmlCached(citySlug, slug);
  } catch (error) {
    console.error("[photographer-mirror] getMirrorHtml failed", error);
    return null;
  }
}

// Exported for potential reuse / tests.
export { injectAssetPrefix };
