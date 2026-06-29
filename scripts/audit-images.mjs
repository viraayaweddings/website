const base = "http://localhost:3000";
const maxPages = 220;
const requestTimeoutMs = 8000;
const fallbackLengths = new Set([7438]);
const seeds = [
  "/",
  "/wedding-services",
  "/wedding-venues",
  "/wedding-photographers",
  "/wedding-decorators",
  "/wedding-ideas",
  "/wedding-photography",
  "/wedding",
  "/about-us",
  "/careers",
  "/contact-us",
  "/partner-onboarding-form",
  "/wedding-invitation-card",
  "/client-terms",
  "/vendor-terms",
  "/privacy-policy",
  "/refund-policy"
];

function normalizeUrl(value, pageUrl) {
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return null;
  try {
    return new URL(value.replaceAll("&amp;", "&"), pageUrl).href;
  } catch {
    return null;
  }
}

function isInternalPage(url) {
  const parsed = new URL(url);
  if (parsed.origin !== base) return false;
  if (/\.(?:avif|gif|ico|jpe?g|js|json|mp4|png|svg|webp|woff2?)$/i.test(parsed.pathname)) {
    return false;
  }
  if (
    parsed.pathname.startsWith("/api/") ||
    parsed.pathname.startsWith("/twc-api/") ||
    parsed.pathname.startsWith("/_next/") ||
    parsed.pathname.startsWith("/twc-next/") ||
    parsed.pathname.startsWith("/twc-mirror/") ||
    parsed.pathname.startsWith("/venue-assets/") ||
    parsed.pathname.startsWith("/twc-image-proxy/")
  ) {
    return false;
  }
  return true;
}

function extractAttrs(html, attrs) {
  const pattern = new RegExp(`\\b(?:${attrs.join("|")})=["']([^"']+)["']`, "gi");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function extractSrcset(value) {
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url);
  const text = await response.text();
  return { response, text };
}

async function auditImage(url) {
  const response = await fetchWithTimeout(url);
  const buffer = await response.arrayBuffer();
  const length = buffer.byteLength;
  const type = response.headers.get("content-type") || "";
  const badStatus = response.status >= 400;
  const badType = !type.startsWith("image/") && !type.startsWith("video/");
  const genericFallback =
    url.includes("/venue-assets/") &&
    type.startsWith("image/") &&
    fallbackLengths.has(length) &&
    !url.includes("NoVenueImageFound");

  return {
    url,
    status: response.status,
    type,
    length,
    issue: badStatus ? "status" : badType ? "type" : genericFallback ? "fallback" : ""
  };
}

const queue = seeds.map((seed) => new URL(seed, base).href);
const seenPages = new Set();
const pageErrors = [];
const imageSources = new Map();

while (queue.length && seenPages.size < maxPages) {
  const pageUrl = queue.shift();
  if (!pageUrl || seenPages.has(pageUrl)) continue;
  seenPages.add(pageUrl);

  let text;
  let response;
  try {
    ({ response, text } = await fetchText(pageUrl));
  } catch (error) {
    pageErrors.push({ url: pageUrl, error: String(error) });
    continue;
  }

  if (response.status >= 400) {
    pageErrors.push({ url: pageUrl, status: response.status });
    continue;
  }

  for (const href of extractAttrs(text, ["href"])) {
    const next = normalizeUrl(href, pageUrl);
    if (next && isInternalPage(next) && !seenPages.has(next) && !queue.includes(next)) {
      queue.push(next);
    }
  }

  for (const raw of extractAttrs(text, ["src", "poster", "content"])) {
    const normalized = normalizeUrl(raw, pageUrl);
    if (!normalized) continue;
    const parsed = new URL(normalized);
    if (parsed.origin !== base) continue;
    if (!/\.(?:avif|gif|ico|jpe?g|mp4|png|svg|webp)(?:$|\?)/i.test(parsed.pathname)) continue;
    if (!imageSources.has(normalized)) imageSources.set(normalized, new Set());
    imageSources.get(normalized).add(pageUrl);
  }

  for (const rawSrcset of extractAttrs(text, ["srcset"])) {
    for (const item of extractSrcset(rawSrcset)) {
      const normalized = normalizeUrl(item, pageUrl);
      if (!normalized) continue;
      const parsed = new URL(normalized);
      if (parsed.origin !== base) continue;
      if (!imageSources.has(normalized)) imageSources.set(normalized, new Set());
      imageSources.get(normalized).add(pageUrl);
    }
  }
}

const imageResults = [];
const imageUrls = [...imageSources.keys()];
const concurrency = 24;
let cursor = 0;

async function worker() {
  while (cursor < imageUrls.length) {
    const url = imageUrls[cursor++];
    try {
      const result = await auditImage(url);
      if (result.issue) {
        imageResults.push({
          ...result,
          pages: [...imageSources.get(url)].slice(0, 8)
        });
      }
    } catch (error) {
      imageResults.push({
        url,
        issue: "fetch",
        error: String(error),
        pages: [...imageSources.get(url)].slice(0, 8)
      });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

const imageIssuesByType = imageResults.reduce((counts, issue) => {
  counts[issue.issue] = (counts[issue.issue] || 0) + 1;
  return counts;
}, {});
const imageIssuesByPage = imageResults.reduce((counts, issue) => {
  for (const page of issue.pages || []) counts[page] = (counts[page] || 0) + 1;
  return counts;
}, {});
const topIssuePages = Object.entries(imageIssuesByPage)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 30)
  .map(([url, count]) => ({ url, count }));

const summary = {
  pagesChecked: seenPages.size,
  imagesChecked: imageSources.size,
  pageErrorsCount: pageErrors.length,
  pageErrors: pageErrors.slice(0, 40),
  imageIssuesCount: imageResults.length,
  imageIssuesByType,
  topIssuePages,
  imageIssues: imageResults.slice(0, 120)
};

console.log(JSON.stringify(summary, null, 2));
