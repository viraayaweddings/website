import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { allowedCityName, isAllowedCitySlug, normalizeCitySlug, safeDecodeURIComponent } from "./allowed-cities";
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

const PHOTOGRAPHER_IMAGE_FALLBACKS = [
  "/twc-photographers/cards/11e42d27-2a7c-4b31-bdd7-f1c7014ff273.jpg",
  "/twc-photographers/cards/1bc661d9-014c-445b-bccc-6e14a42bca7e.jpg",
  "/twc-photographers/cards/3ce9cf86-72a6-4851-9fc8-7f0f154c1ba3.jpg",
  "/twc-photographers/cards/413eac7b-e7e7-4373-97cf-88b9c046bd11.webp",
  "/twc-photographers/cards/51f63f4e-f65c-49c1-8258-6f45fb25125b.jpg",
  "/twc-photographers/cards/53b9fc12-e4ea-42e6-b34e-910fc36cf30f.png",
  "/twc-photographers/cards/6feaa4c0-c37a-4bca-8661-5ebb956b21cc.jpg",
  "/twc-photographers/cards/818423a9-c75a-47a1-a7e4-4d41e5ea032d.webp",
  "/twc-photographers/cards/88502113-16cd-44a4-a8a9-e3b2864779f5.jpg",
  "/twc-photographers/cards/a2c2896a-f018-49e0-957b-193ac74615a2.jpg",
  "/twc-photographers/cards/d0a8633e-48cf-482e-aa01-f68079f1169f.webp",
  "/twc-photographers/cards/ee6b561f-c3e6-4abb-86c9-9e9a4c354555.webp"
];
const RENDERABLE_IMAGE_PATH_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

// Client-side branding pass: rewrites any residual "The Wedding Company" name,
// logos, links and favicon to Viraaya Weddings after the page hydrates.
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
    ["/twc-venues-local/imageswedding." + oldDomain, "/venue-assets/imageswedding"],
    ["/twc-venues-local/storage.googleapis.com", "/venue-assets/storage"]
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

function fallbackPhotographerImages(seed: string, count = 5) {
  const start = hashString(seed) % PHOTOGRAPHER_IMAGE_FALLBACKS.length;
  return Array.from({ length: Math.min(count, PHOTOGRAPHER_IMAGE_FALLBACKS.length) }, (_, index) =>
    PHOTOGRAPHER_IMAGE_FALLBACKS[(start + index) % PHOTOGRAPHER_IMAGE_FALLBACKS.length]
  );
}

function hasLocalImage(publicPath: string) {
  return localPublicImageExists(publicPath);
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : v == null ? null : Number(v) || 0;
}

function mediaItemFromUrl(mediaUrl: string, mediaId: string | null = null, mimeType = "image/webp") {
  return {
    mediaUrl,
    alt: "",
    mediaId,
    mimeType,
    compressedMediaUrl: null,
    videoThumbnailUrl: null
  };
}

function localizePhotographerServiceAssets(vd: any, seed: string) {
  const services = vd?.services;
  if (!services || typeof services !== "object") return;
  const images = fallbackPhotographerImages(`${seed}-services`, 10);
  let index = 0;
  for (const key of ["skills", "occasions"]) {
    if (!Array.isArray(services[key])) continue;
    services[key] = services[key].map((item: any) => ({
      ...item,
      url: images[index++ % images.length]
    }));
  }
}

function coverMediaFor(media: any[], seed: string) {
  const items = media
    .map((m) => ({
      ...m,
      mediaUrl: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl)
    }))
    .filter((m) => RENDERABLE_IMAGE_PATH_PATTERN.test(m.mediaUrl))
    .filter((m) => hasLocalImage(m.mediaUrl));

  if (!items.length) {
    return fallbackPhotographerImages(seed).map((url) => mediaItemFromUrl(url));
  }

  return items.map((m) => ({
    mediaUrl: m.mediaUrl,
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
  const vd = sanitizePricingData(localizeDeep({ ...baseVd, ...(hasDetail ? dp : lp) }));

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
  vd.displayPic = hasLocalImage(localizeUrl(vd.displayPic)) ? localizeUrl(vd.displayPic) : "/photographer-icons/camera.svg";

  // Prefer DB media (ordered, deduped at import) for the gallery when present.
  const media = [...(row.media || [])].sort((a: any, b: any) => a.position - b.position);
  vd.coverMedia = coverMediaFor(media, row.vendorId);
  localizePhotographerServiceAssets(vd, row.vendorId);

  return vd;
}

function rewriteInitialPhotographerImages(html: string, mediaUrls: string[]) {
  if (!mediaUrls.length) return html;
  let index = 0;
  const withGalleryImages = html.replace(
    /(<img\b(?=[^>]*\bsrc=["']\/venue-assets\/(?:gcpimages|imageswedding|weddingimage)\/)[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, _src, suffix) => {
      const replacement = mediaUrls[index % mediaUrls.length];
      index += 1;
      return `${prefix}${replacement}${suffix}`;
    }
  );
  return withGalleryImages.replace(
    /(<img\b(?=[^>]*\bsrc=["']\/venue-assets\/storage\/bh_dev_bucket\/weddings\/photography\/)[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, _src, suffix) => {
      const replacement = mediaUrls[index % mediaUrls.length];
      index += 1;
      return `${prefix}${replacement}${suffix}`;
    }
  ).replace(
    /(<img\b(?=[^>]*\bsrc=["']\/venue-assets\/maps\/mapfiles\/place_api\/icons\/)[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, _src, suffix) => `${prefix}/photographer-icons/camera.svg${suffix}`
  );
}

function photographerImageRuntimeScript(mediaUrls: string[]) {
  if (!mediaUrls.length) return "";
  const json = serializeForScript(mediaUrls);
  return `
<script id="viraaya-photographer-image-fallbacks">
(() => {
  const images = ${json};
  let index = 0;
  const stalePattern = /\\/venue-assets\\/(?:gcpimages|imageswedding|weddingimage)\\//i;
  const storagePattern = /\\/venue-assets\\/storage\\/bh_dev_bucket\\/weddings\\/photography\\//i;
  const mapsIconPattern = /\\/venue-assets\\/maps\\/mapfiles\\/place_api\\/icons\\//i;
  const nextImage = () => images[index++ % images.length];
  const fix = (img) => {
    if (!img || !img.getAttribute) return;
    const src = img.getAttribute("src") || "";
    if (!stalePattern.test(src) && !storagePattern.test(src) && !mapsIconPattern.test(src)) return;
    img.setAttribute("src", mapsIconPattern.test(src)
        ? "/photographer-icons/camera.svg"
        : nextImage());
    img.removeAttribute("srcset");
  };
  const sweep = () => document.querySelectorAll("img").forEach(fix);
  sweep();
  [80, 250, 700, 1500, 3000].forEach((delay) => setTimeout(sweep, delay));
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches && node.matches("img")) fix(node);
        if (node.querySelectorAll) node.querySelectorAll("img").forEach(fix);
      });
      if (mutation.type === "attributes" && mutation.target?.matches?.("img")) fix(mutation.target);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset"] });
})();
</script>`;
}

function photographerGalleryRuntimeScript(mediaUrls: string[], vendorName: string) {
  if (!mediaUrls.length) return "";
  const imagesJson = serializeForScript(mediaUrls);
  const nameJson = serializeForScript(vendorName || "Gallery");
  return `
<script id="viraaya-photographer-gallery">
(() => {
  const images = ${imagesJson};
  const vendorName = ${nameJson};
  const overlayId = "viraaya-local-photographer-gallery";
  const styleId = "viraaya-local-photographer-gallery-style";
  const isGalleryUrl = () => new URLSearchParams(window.location.search).get("type") === "gallery";
  const closeGallery = () => {
    document.getElementById(overlayId)?.remove();
    const url = new URL(window.location.href);
    url.searchParams.delete("type");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  };
  const ensureStyles = () => {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = \`
      #\${overlayId} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.62);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 24px;
        overflow: auto;
      }
      #\${overlayId} .vw-gallery-panel {
        width: min(1480px, calc(100vw - 48px));
        min-height: min(840px, calc(100vh - 48px));
        background: #fff;
        border-radius: 14px;
        padding: 28px 36px 36px;
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
      }
      #\${overlayId} .vw-gallery-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 24px;
      }
      #\${overlayId} h2 {
        margin: 0;
        color: #111827;
        font-family: inherit;
        font-size: 28px;
        font-weight: 500;
        line-height: 1.2;
      }
      #\${overlayId} .vw-gallery-close {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        background: #f3f4f6;
        color: #111827;
        cursor: pointer;
        font-size: 30px;
        line-height: 40px;
      }
      #\${overlayId} .vw-gallery-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
      }
      #\${overlayId} img {
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border-radius: 10px;
        background: #f3f4f6;
      }
      @media (max-width: 900px) {
        #\${overlayId} { padding: 12px; }
        #\${overlayId} .vw-gallery-panel { width: calc(100vw - 24px); padding: 20px; }
        #\${overlayId} .vw-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        #\${overlayId} h2 { font-size: 22px; }
      }
      @media (max-width: 560px) {
        #\${overlayId} .vw-gallery-grid { grid-template-columns: 1fr; }
      }
    \`;
    document.head.appendChild(style);
  };
  const renderGallery = () => {
    if (!isGalleryUrl()) {
      document.getElementById(overlayId)?.remove();
      return;
    }
    if (document.getElementById(overlayId)) return;
    ensureStyles();
    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = \`
      <div class="vw-gallery-panel">
        <div class="vw-gallery-head">
          <h2></h2>
          <button class="vw-gallery-close" type="button" aria-label="Close gallery">&times;</button>
        </div>
        <div class="vw-gallery-grid"></div>
      </div>
    \`;
    overlay.querySelector("h2").textContent = vendorName;
    const grid = overlay.querySelector(".vw-gallery-grid");
    images.forEach((src, index) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = vendorName + " gallery image " + (index + 1);
      img.loading = index < 6 ? "eager" : "lazy";
      img.decoding = "async";
      grid.appendChild(img);
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeGallery();
    });
    overlay.querySelector(".vw-gallery-close").addEventListener("click", closeGallery);
    document.body.appendChild(overlay);
  };
  const patchHistory = (method) => {
    const original = window.history[method];
    window.history[method] = function patchedHistory() {
      const result = original.apply(this, arguments);
      setTimeout(renderGallery, 0);
      return result;
    };
  };
  patchHistory("pushState");
  patchHistory("replaceState");
  window.addEventListener("popstate", renderGallery);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById(overlayId)) closeGallery();
  });
  renderGallery();
  [80, 250, 700, 1500, 3000].forEach((delay) => setTimeout(renderGallery, delay));
})();
</script>`;
}

function buildSimilarPhotographers(rows: any[]) {
  return rows.map((row) => {
    const localizedMedia = [...(row.media || [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((m: any) => ({
        url: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl),
        mimeType: m.mimeType || "image/webp",
        mediaId: m.mediaId,
        compressedMediaUrl: null
      }))
      .filter((m: any) => RENDERABLE_IMAGE_PATH_PATTERN.test(m.url))
      .filter((m: any) => hasLocalImage(m.url))
      .slice(0, 4);
    const media = localizedMedia.length
      ? localizedMedia
      : fallbackPhotographerImages(row.vendorId, 4).map((url) => ({
          url,
          mimeType: "image/webp",
          mediaId: null,
          compressedMediaUrl: null
        }));
    return {
      vendorId: row.vendorId,
      urlSlug: row.slug,
      media,
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
  const c = normalizeCitySlug(citySlug);
  if (!isAllowedCitySlug(c)) return null;
  const s = safeDecodeURIComponent(slug).trim().toLowerCase();
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
  const vendorDetails = buildPhotographerDetails(base, row);
  const detailMediaUrls = (vendorDetails.coverMedia || [])
    .map((media: any) => media?.mediaUrl)
    .filter((src: any): src is string => typeof src === "string" && src.length > 0);
  base.props.pageProps.vendorDetails = vendorDetails;
  base.props.pageProps.similarPhotographerList = buildSimilarPhotographers(similarRows);
  base.props.pageProps.citySlug = row.citySlug;
  base.props.pageProps.slug = row.slug;
  base.query = { citySlug: row.citySlug, slug: row.slug };
  base.assetPrefix = "/twc-mirror";

  let html = getTemplate();
  html = injectNextData(html, sanitizePricingData(base));
  html = applyHomepageHeaderFooter(html);
  html = localizeAssetPaths(html);
  html = rewriteInitialPhotographerImages(html, detailMediaUrls);
  html = stripExternalRuntime(html);
  html = applyBranding(html);
  html = injectHomepageShellSupport(html);
  html = sanitizePricingMarkup(html);
  const cityName = allowedCityName(row.citySlug);
  html = rewriteHeadSeo(html, {
    title: `${vendorDetails.name}, ${cityName} - Wedding Photographer`,
    description: `${vendorDetails.name} in ${cityName}. View portfolio, photos, reviews and details, and enquire online with Viraaya Weddings.`
  });
  return html.replace(
    "</body>",
    `${PRICING_RUNTIME_SCRIPT}${photographerImageRuntimeScript(detailMediaUrls)}${photographerGalleryRuntimeScript(detailMediaUrls, vendorDetails.name)}${BRAND_RUNTIME_SCRIPT}</body>`
  );
}

// Cache the fully-rendered detail HTML so a hot page never touches Neon. The
// cloned data is static, so a long revalidate keeps DB hits to ~once/day/page.
const getMirrorHtmlCached = unstable_cache(getMirrorHtmlUncached, ["photographer-mirror-html-brand-gold-v31-per-vendor-seo"], {
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
