import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { queryDecorators } from "./decorator-data";
import {
  applyBranding,
  applyHomepageHeaderFooter,
  injectHomepageShellSupport
} from "../homepage-shell";

let cachedListingTemplate: string | null = null;
let cachedDetailTemplate: string | null = null;
let cachedListingNextData: any = null;
let cachedDetailNextData: any = null;

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
    [oldAbbr + " Partner", "Viraaya Partner"],
    [oldAbbr + "'s choice", "Viraaya's choice"],
    [oldAbbr + "’s choice", "Viraaya's choice"],
    [oldSite, "https://viraayaweddings.com"],
    [oldHost, "viraayaweddings.com"],
    ["/twc-mirror/_next/static/media/TheWedding" + "CompanyLogo_Low_Res.88e6d171.webp", "/brand/viraaya-logo-header.png"],
    ["/twc-mirror/_next/static/media/TheWedding" + "CompanyLogoVertical.b80524ce.webp", "/brand/viraaya-logo-full.png"]
  ];
  const rewrite = (value) => {
    if (!value || typeof value !== "string") return value;
    let next = value;
    for (const [from, to] of replacements) next = next.split(from).join(to);
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
  [120, 400, 1000, 2500, 5000].forEach((t) => setTimeout(sweep, t));
  window.addEventListener("pageshow", sweep, { once: true });
})();
</script>`;

function getListingTemplate() {
  if (!cachedListingTemplate) {
    cachedListingTemplate = fs.readFileSync(
      path.join(process.cwd(), "data", "captured-company", "wedding-decorators.html"),
      "utf8"
    );
  }
  return cachedListingTemplate;
}

function getDetailTemplate() {
  if (!cachedDetailTemplate) {
    cachedDetailTemplate = fs.readFileSync(
      path.join(process.cwd(), "data", "decorators", "captured-decorator-detail.html"),
      "utf8"
    );
  }
  return cachedDetailTemplate;
}

function extractNextData(html: string) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return JSON.parse(m![1]);
}

function getListingBaseNextData(): any {
  if (!cachedListingNextData) cachedListingNextData = extractNextData(getListingTemplate());
  return JSON.parse(JSON.stringify(cachedListingNextData));
}

function getDetailBaseNextData(): any {
  if (!cachedDetailNextData) cachedDetailNextData = extractNextData(getDetailTemplate());
  return JSON.parse(JSON.stringify(cachedDetailNextData));
}

function aliasLocalAssetPaths(value: string) {
  let next = value;
  for (const [oldPath, alias] of LOCAL_ALIASES) next = next.split(oldPath).join(alias);
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

function num(v: unknown): number | null {
  return typeof v === "number" ? v : v == null ? null : Number(v) || null;
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

function emptyAbout(row: any) {
  return {
    ops: [
      { insert: `${row.name} - Wedding Decorators in ${row.citySlug}\n` },
      { attributes: { header: 2 }, insert: "\n" }
    ]
  };
}

function buildDecoratorDetails(base: any, row: any) {
  const dp = row.detailPayload && typeof row.detailPayload === "object" ? row.detailPayload : {};
  const lp = row.listingPayload && typeof row.listingPayload === "object" ? row.listingPayload : {};
  const baseVd = (base.props?.pageProps?.vendorDetails || {}) as Record<string, any>;
  const hasDetail = !!(dp && (dp.name || dp.coverMedia || dp.about || dp.meta));
  const vd = localizeDeep(hasDetail ? { ...baseVd, ...dp } : { ...lp });

  vd.businessCategory = "DECORATION";
  vd.vendorId = row.vendorId;
  vd.name = row.name;
  vd.urlSlug = row.slug;
  vd.formattedAddress = row.formattedAddress || vd.formattedAddress || "";
  vd.userRating = num(row.userRating);
  vd.userRatingCount = row.userRatingCount ?? null;
  vd.bhPartnerStatus = !!row.isBhPartner;
  vd.bhPartnerDealText = row.bhPartnerDealText ?? null;
  vd.meta = {
    ...(vd.meta || {}),
    indoorPrice: row.indoorPrice ?? vd.meta?.indoorPrice ?? row.minDecorCost ?? null,
    outdoorPrice: row.outdoorPrice ?? vd.meta?.outdoorPrice ?? row.minDecorCost ?? null
  };
  if (!vd.about) vd.about = emptyAbout(row);
  if (row.longitude != null && row.latitude != null) vd.coordinates = [row.longitude, row.latitude];

  const media = [...(row.media || [])].sort((a: any, b: any) => a.position - b.position);
  // The detail bundle reads these fields unconditionally:
  //  - coverMedia -> passed to the photo section as `imageUrls` (indexes [0])
  //  - services   -> Object.entries(services) and services[tab] in the info tabs
  //  - reviews    -> mapped by the reviews section
  // Vendors imported without a rich detailPayload would otherwise have these
  // undefined, which crashes the page to a blank screen. Default them so the
  // page always renders (empty sections collapse on their own).
  vd.coverMedia = media.length
    ? coverMediaFor(media)
    : Array.isArray(vd.coverMedia)
      ? vd.coverMedia
      : [];
  if (!vd.services || typeof vd.services !== "object" || Array.isArray(vd.services)) {
    vd.services = {};
  }
  if (!Array.isArray(vd.reviews)) vd.reviews = [];
  return vd;
}

function buildSeoMeta(base: any, row: any) {
  const seo = row.seoPayload && typeof row.seoPayload === "object" ? row.seoPayload : base.props?.pageProps?.seoMetaData || {};
  const title = `${row.name} - Wedding Decorators in ${row.city?.name || row.citySlug} | Viraaya Weddings`;
  const description = `${row.name} wedding decorator details, prices, photos and address.`;
  const next = JSON.parse(JSON.stringify(seo));
  next.head = next.head || {};
  next.openGraph = next.openGraph || {};
  next.twitterCard = next.twitterCard || {};
  next.head.title = { value: title };
  next.head.metaDescription = { value: description };
  next.openGraph.title = { value: title };
  next.openGraph.description = { value: description };
  next.twitterCard.title = { value: title };
  next.twitterCard.description = { value: description };
  return localizeDeep(next);
}

function injectNextData(html: string, nextData: any): string {
  const open = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(open);
  if (start === -1) return html;
  const contentStart = start + open.length;
  const end = html.indexOf("</script>", contentStart);
  const json = JSON.stringify(nextData).replace(/</g, "\\u003c");
  return html.slice(0, contentStart) + json + html.slice(end);
}

function localizeAssetPaths(html: string): string {
  let out = html.split("/_next/").join("/twc-mirror/_next/");
  for (const [live, local] of LOCAL_HOSTS) out = out.split(live).join(local);
  return aliasLocalAssetPaths(out);
}

function finalizeHtml(html: string) {
  html = applyHomepageHeaderFooter(html);
  html = localizeAssetPaths(html);
  html = applyBranding(html);
  html = injectHomepageShellSupport(html);
  return html.replace("</body>", `${BRAND_RUNTIME_SCRIPT}</body>`);
}

async function getListingHtmlUncached(citySlug?: string): Promise<string> {
  const base = getListingBaseNextData();
  const params: Record<string, string> = { limit: "24", page: "1" };
  if (citySlug) params.citySlug = citySlug;
  const initialVendorList = await queryDecorators(params);

  base.props = base.props || {};
  base.props.pageProps = base.props.pageProps || {};
  base.props.pageProps.initialVendorList = initialVendorList;
  base.assetPrefix = "/twc-mirror";
  if (citySlug) {
    base.page = "/wedding-decorators/[decorCity]";
    base.query = { decorCity: citySlug };
  }

  let html = finalizeHtml(injectNextData(getListingTemplate(), base));

  // City routes reuse the base listing template, whose page-chunk <script>/<link>
  // points at the /wedding-decorators page bundle. With page set to
  // /wedding-decorators/[decorCity], Next must hydrate with the [decorCity] page
  // bundle instead, otherwise the route never hydrates (the count/filters stay
  // frozen on the captured static HTML). Swap the page-chunk reference so the
  // correct bundle loads. Hashes are pinned to the mirrored build.
  if (citySlug) {
    html = html
      .split(LISTING_PAGE_CHUNK)
      .join(CITY_PAGE_CHUNK);
  }

  return html;
}

const LISTING_PAGE_CHUNK = "chunks/pages/wedding-decorators-7062090bc31ac2b2.js";
const CITY_PAGE_CHUNK = "chunks/pages/wedding-decorators/[decorCity]-91722e07de12a3b0.js";

const DECORATOR_INCLUDE = {
  city: true,
  media: { orderBy: { position: "asc" as const } }
} as const;

async function findDecorator(citySlug: string, slug: string) {
  const c = decodeURIComponent(citySlug || "").trim().toLowerCase();
  const s = decodeURIComponent(slug).trim().toLowerCase();
  const exact = await (prisma as any).decorator.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { equals: s, mode: "insensitive" } },
    include: DECORATOR_INCLUDE
  });
  if (exact) return exact;
  return (prisma as any).decorator.findFirst({
    where: { slug: { equals: s, mode: "insensitive" } },
    include: DECORATOR_INCLUDE
  });
}

async function getDetailHtmlUncached(citySlug: string, slug: string): Promise<string | null> {
  const row = await findDecorator(citySlug, slug);
  if (!row) return null;

  const base = getDetailBaseNextData();
  base.props = base.props || {};
  base.props.pageProps = base.props.pageProps || {};
  base.props.pageProps.vendorDetails = buildDecoratorDetails(base, row);
  base.props.pageProps.seoMetaData = buildSeoMeta(base, row);
  base.props.pageProps.isLocalitySlug = false;
  base.query = { decorCity: row.citySlug, decorLocalityOrCategorySlug: row.slug };
  base.assetPrefix = "/twc-mirror";

  return finalizeHtml(injectNextData(getDetailTemplate(), base));
}

const getListingHtmlCached = unstable_cache(
  getListingHtmlUncached,
  ["decorator-listing-html-brand-gold-v6"],
  { revalidate: 86400, tags: ["decorators"] }
);

const getDetailHtmlCached = unstable_cache(
  getDetailHtmlUncached,
  ["decorator-detail-html-brand-gold-v6"],
  { revalidate: 86400, tags: ["decorators"] }
);

export async function getDecoratorListingHtml(citySlug?: string) {
  try {
    return await getListingHtmlCached(citySlug);
  } catch (error) {
    console.error("[decorator-mirror] getDecoratorListingHtml failed", error);
    return finalizeHtml(getListingTemplate());
  }
}

export async function getDecoratorDetailHtml(citySlug: string, slug: string) {
  try {
    return await getDetailHtmlCached(citySlug, slug);
  } catch (error) {
    console.error("[decorator-mirror] getDecoratorDetailHtml failed", error);
    return null;
  }
}
