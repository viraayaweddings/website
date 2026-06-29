import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { isAllowedCitySlug, normalizeCitySlug } from "./allowed-cities";
import { prisma } from "./prisma";
import { queryDecorators } from "./decorator-data";
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

let cachedListingTemplate: string | null = null;
let cachedDetailTemplate: string | null = null;
let cachedListingNextData: any = null;
let cachedDetailNextData: any = null;

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

const DECORATOR_IMAGE_FALLBACKS = [
  "/images/HomePage/new/vendor-2.webp",
  "/twc-next/static/media/weddingTestimonial.2d6627ae.webp",
  "/twc-next/static/media/Mandap.d8d5d35e.webp",
  "/twc-assets/ideabook/decor.webp",
  "/images/HomePage/new/vendor-1.webp"
];
const RENDERABLE_IMAGE_PATH_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|$)/i;

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
    ["/twc-mirror/_next/static/media/TheWedding" + "CompanyLogoVertical.b80524ce.webp", "/brand/viraaya-logo-full.png"],
    ["https://gcpimages." + oldDomain, "/venue-assets/gcpimages"],
    ["https://imageswedding." + oldDomain, "/venue-assets/imageswedding"],
    ["https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
    ["https://storage.googleapis.com", "/venue-assets/storage"],
    ["https://maps.gstatic.com", "/venue-assets/maps"],
    ["https://cdn.prod.website-files.com", "/venue-assets/webflowcdn"],
    ["https://assets-global.website-files.com", "/venue-assets/webflowassets"]
  ];
  const rewrite = (value) => {
    if (!value || typeof value !== "string") return value;
    let next = value;
    for (const [from, to] of replacements) next = next.split(from).join(to);
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

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackDecoratorImages(seed: string, count = 8) {
  const start = hashString(seed) % DECORATOR_IMAGE_FALLBACKS.length;
  return Array.from({ length: Math.min(count, DECORATOR_IMAGE_FALLBACKS.length) }, (_, index) =>
    DECORATOR_IMAGE_FALLBACKS[(start + index) % DECORATOR_IMAGE_FALLBACKS.length]
  );
}

function localFileForPublicPath(publicPath: string) {
  if (publicPath.startsWith("/venue-assets/gcpimages/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "gcpimages.theweddingcompany.com",
      ...publicPath.replace("/venue-assets/gcpimages/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/imageswedding/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "imageswedding.theweddingcompany.com",
      ...publicPath.replace("/venue-assets/imageswedding/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/weddingimage/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "weddingimage.betterhalf.ai",
      ...publicPath.replace("/venue-assets/weddingimage/", "").split("/")
    );
  }
  if (publicPath.startsWith("/venue-assets/storage/")) {
    return path.join(
      process.cwd(),
      "public",
      "twc-venues-local",
      "storage.googleapis.com",
      ...publicPath.replace("/venue-assets/storage/", "").split("/")
    );
  }
  if (publicPath.startsWith("/")) {
    return path.join(process.cwd(), "public", ...publicPath.slice(1).split("/"));
  }
  return null;
}

function hasLocalImage(publicPath: string) {
  const file = localFileForPublicPath(publicPath);
  return Boolean(file && fs.existsSync(file));
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

function coverMediaFor(media: any[], seed: string) {
  const items = media
    .map((m) => ({
      ...m,
      mediaUrl: localizeUrl(m.localPath && m.localPath.startsWith("/") ? m.localPath : m.originalUrl)
    }))
    .filter((m) => RENDERABLE_IMAGE_PATH_PATTERN.test(m.mediaUrl))
    .filter((m) => hasLocalImage(m.mediaUrl));

  if (!items.length) {
    return fallbackDecoratorImages(seed).map((url) =>
      mediaItemFromUrl(url, null, /\.jpe?g(?:\?|$)/i.test(url) ? "image/jpeg" : "image/webp")
    );
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

function localizeDecoratorServiceAssets(vd: any, seed: string) {
  if (!vd?.services || typeof vd.services !== "object") return;
  const fallbackImages = fallbackDecoratorImages(`${seed}-services`, DECORATOR_IMAGE_FALLBACKS.length);
  let index = 0;
  const nextImage = () => fallbackImages[index++ % fallbackImages.length];

  Object.values(vd.services).forEach((section: any) => {
    if (!Array.isArray(section)) return;
    section.forEach((item: any) => {
      if (!item || typeof item !== "object") return;
      const localUrl = typeof item.url === "string" ? localizeUrl(item.url) : "";
      const localImage = typeof item.image === "string" ? localizeUrl(item.image) : "";
      item.url = localUrl && RENDERABLE_IMAGE_PATH_PATTERN.test(localUrl) && hasLocalImage(localUrl) ? localUrl : nextImage();
      if ("image" in item) {
        item.image = localImage && RENDERABLE_IMAGE_PATH_PATTERN.test(localImage) && hasLocalImage(localImage) ? localImage : item.url;
      }
    });
  });
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
  const vd = sanitizePricingData(localizeDeep({ ...baseVd, ...(hasDetail ? dp : lp) }));

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
    indoorPrice: null,
    outdoorPrice: null,
    startsAt: null
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
  vd.coverMedia = coverMediaFor(media, row.vendorId);
  if (!vd.services || typeof vd.services !== "object" || Array.isArray(vd.services)) {
    vd.services = {};
  }
  if (!Array.isArray(vd.reviews)) vd.reviews = [];
  localizeDecoratorServiceAssets(vd, row.vendorId);
  return vd;
}

function buildSeoMeta(base: any, row: any) {
  const seo = row.seoPayload && typeof row.seoPayload === "object" ? row.seoPayload : base.props?.pageProps?.seoMetaData || {};
  const title = `${row.name} - Wedding Decorators in ${row.city?.name || row.citySlug} | Viraaya Weddings`;
  const description = `${row.name} wedding decorator details, photos and address.`;
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
  return sanitizePricingData(localizeDeep(next));
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

function rewriteInitialDecoratorImages(html: string, mediaUrls: string[]) {
  if (!mediaUrls.length) return html;
  let index = 0;
  return html.replace(
    /(<img\b(?=[^>]*\bsrc=["']\/venue-assets\/(?:gcpimages|imageswedding|weddingimage|storage)\/)[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, _src, suffix) => {
      const replacement = mediaUrls[index % mediaUrls.length];
      index += 1;
      return `${prefix}${replacement}${suffix}`
        .replace(/\s+srcset=["'][^"']*["']/gi, "")
        .replace(/\s+sizes=["'][^"']*["']/gi, "");
    }
  ).replace(
    /(<img\b(?=[^>]*\bsrc=["']\/venue-assets\/maps\/mapfiles\/place_api\/icons\/)[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, _src, suffix) => `${prefix}/brand/favicon.png${suffix}`
      .replace(/\s+srcset=["'][^"']*["']/gi, "")
      .replace(/\s+sizes=["'][^"']*["']/gi, "")
  );
}

function decoratorImageRuntimeScript(mediaUrls: string[]) {
  if (!mediaUrls.length) return "";
  const json = JSON.stringify(mediaUrls).replace(/</g, "\\u003c");
  return `
<script id="viraaya-decorator-image-fallbacks">
(() => {
  const images = ${json};
  let index = 0;
  const stalePattern = /\\/venue-assets\\/(?:gcpimages|imageswedding|weddingimage|storage)\\//i;
  const storagePattern = /\\/venue-assets\\/storage\\/bh_dev_bucket\\/weddings\\/decor/i;
  const mapsIconPattern = /\\/venue-assets\\/maps\\/mapfiles\\/place_api\\/icons\\//i;
  const nextImage = () => images[index++ % images.length];
  const fix = (img) => {
    if (!img || !img.getAttribute) return;
    const src = img.getAttribute("src") || "";
    const srcset = img.getAttribute("srcset") || "";
    if (!stalePattern.test(src) && !storagePattern.test(src) && !mapsIconPattern.test(src) && !stalePattern.test(srcset) && !storagePattern.test(srcset) && !mapsIconPattern.test(srcset)) return;
    img.onerror = null;
    img.setAttribute("src", mapsIconPattern.test(src) || mapsIconPattern.test(srcset) ? "/brand/favicon.png" : nextImage());
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
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

function decoratorGalleryRuntimeScript(mediaUrls: string[], vendorName: string) {
  if (!mediaUrls.length) return "";
  const imagesJson = JSON.stringify(mediaUrls).replace(/</g, "\\u003c");
  const nameJson = JSON.stringify(vendorName || "Gallery").replace(/</g, "\\u003c");
  return `
<script id="viraaya-decorator-gallery">
(() => {
  const images = ${imagesJson};
  const vendorName = ${nameJson};
  const overlayId = "viraaya-local-decorator-gallery";
  const styleId = "viraaya-local-decorator-gallery-style";
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

function finalizeHtml(html: string, mediaUrls: string[] = [], vendorName = "") {
  html = applyHomepageHeaderFooter(html);
  html = localizeAssetPaths(html);
  html = rewriteInitialDecoratorImages(html, mediaUrls);
  html = stripExternalRuntime(html);
  html = applyBranding(html);
  html = injectHomepageShellSupport(html);
  html = sanitizePricingMarkup(html);
  return html.replace(
    "</body>",
    `${PRICING_RUNTIME_SCRIPT}${decoratorImageRuntimeScript(mediaUrls)}${decoratorGalleryRuntimeScript(mediaUrls, vendorName)}${BRAND_RUNTIME_SCRIPT}</body>`
  );
}

async function getListingHtmlUncached(citySlug?: string): Promise<string> {
  const normalizedCitySlug = citySlug ? normalizeCitySlug(citySlug) : "";
  const base = getListingBaseNextData();
  const params: Record<string, string> = { limit: "24", page: "1" };
  if (normalizedCitySlug) params.citySlug = normalizedCitySlug;
  const initialVendorList = await queryDecorators(params);

  base.props = base.props || {};
  base.props.pageProps = base.props.pageProps || {};
  base.props.pageProps.initialVendorList = initialVendorList;
  base.assetPrefix = "/twc-mirror";
  if (normalizedCitySlug) {
    base.page = "/wedding-decorators/[decorCity]";
    base.query = { decorCity: normalizedCitySlug };
  }

  const listingMediaUrls = (initialVendorList.results || [])
    .flatMap((vendor: any) => vendor?.media || [])
    .map((media: any) => media?.url)
    .filter((src: any): src is string => typeof src === "string" && src.length > 0);

  let html = finalizeHtml(injectNextData(getListingTemplate(), sanitizePricingData(base)), listingMediaUrls);

  // City routes reuse the base listing template, whose page-chunk <script>/<link>
  // points at the /wedding-decorators page bundle. With page set to
  // /wedding-decorators/[decorCity], Next must hydrate with the [decorCity] page
  // bundle instead, otherwise the route never hydrates (the count/filters stay
  // frozen on the captured static HTML). Swap the page-chunk reference so the
  // correct bundle loads. Hashes are pinned to the mirrored build.
  if (normalizedCitySlug) {
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
  const c = normalizeCitySlug(citySlug);
  if (!isAllowedCitySlug(c)) return null;
  const s = decodeURIComponent(slug).trim().toLowerCase();
  const exact = await (prisma as any).decorator.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { equals: s, mode: "insensitive" } },
    include: DECORATOR_INCLUDE
  });
  if (exact) return exact;
  return (prisma as any).decorator.findFirst({
    where: { citySlug: { equals: c, mode: "insensitive" }, slug: { equals: s, mode: "insensitive" } },
    include: DECORATOR_INCLUDE
  });
}

async function getDetailHtmlUncached(citySlug: string, slug: string): Promise<string | null> {
  const row = await findDecorator(citySlug, slug);
  if (!row) return null;

  const base = getDetailBaseNextData();
  base.props = base.props || {};
  base.props.pageProps = base.props.pageProps || {};
  const vendorDetails = buildDecoratorDetails(base, row);
  const detailMediaUrls = (vendorDetails.coverMedia || [])
    .map((media: any) => media?.mediaUrl)
    .filter((src: any): src is string => typeof src === "string" && src.length > 0);
  base.props.pageProps.vendorDetails = vendorDetails;
  base.props.pageProps.seoMetaData = buildSeoMeta(base, row);
  base.props.pageProps.isLocalitySlug = false;
  base.query = { decorCity: row.citySlug, decorLocalityOrCategorySlug: row.slug };
  base.assetPrefix = "/twc-mirror";

  return finalizeHtml(injectNextData(getDetailTemplate(), sanitizePricingData(base)), detailMediaUrls, vendorDetails.name);
}

const getListingHtmlCached = unstable_cache(
  getListingHtmlUncached,
  ["decorator-listing-html-brand-gold-v26-allowed-cities"],
  { revalidate: 86400, tags: ["decorators"] }
);

const getDetailHtmlCached = unstable_cache(
  getDetailHtmlUncached,
  ["decorator-detail-html-brand-gold-v25-allowed-cities"],
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
