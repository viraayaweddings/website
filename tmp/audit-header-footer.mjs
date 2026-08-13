import fs from "node:fs/promises";

const originalFile = "tmp/vivahnam-homepage-current.html";
const localFile = "tmp/local-homepage-current.html";
const localBase = "http://127.0.0.1:3002";

const allowedRemovedLabels = new Set([
  "Dubai",
  "Ras Al Khaimah",
  "Abu Dhabi",
  "Bangkok",
  "Phuket",
  "Phang Nga",
  "Cairo",
  "Aswan",
  "Hurghada",
  "Hanoi",
  "Ho Chi Minh City",
  "Da Nang",
  "Phu Quoc",
  "Muscat",
  "Salalah",
  "Antalya",
  "Bodrum",
  "Istanbul",
  "Doha",
  "Colombo",
  "USD",
  "AED",
]);

function extractBlock(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "i"));
  if (!match) throw new Error(`Missing <${tag}> block`);
  return match[0];
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&rsquo;/g, "'")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html) {
  return decodeEntities(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function attrMap(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(['"])(.*?)\2/g)) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[3]);
  }
  return attrs;
}

function normalizeUrl(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^(javascript:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, "https://www.vivahnam.com");
    if (url.hostname === "www.vivahnam.com" || url.hostname === "vivahnam.com") {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
    if (url.hostname === "www.learningtlms.in" && url.pathname.startsWith("/vivahnam/")) {
      return url.pathname.replace(/^\/vivahnam/, "") + url.search + url.hash;
    }
    return url.href;
  } catch {
    return trimmed;
  }
}

function extractAnchors(block) {
  const anchors = [];
  for (const match of block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = attrMap(`<a ${match[1]}>`);
    const imgAlt = [...match[2].matchAll(/<img\b([^>]*)>/gi)]
      .map((img) => attrMap(`<img ${img[1]}>`).alt)
      .filter(Boolean)
      .join(" ");
    const text = stripTags(match[2]) || imgAlt || "";
    anchors.push({
      text,
      href: normalizeUrl(attrs.href || ""),
      rawHref: attrs.href || "",
      key: `${text} -> ${normalizeUrl(attrs.href || "")}`,
    });
  }
  return anchors;
}

function extractImages(block) {
  const images = [];
  for (const match of block.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = attrMap(`<img ${match[1]}>`);
    for (const attr of ["src", "data-menu", "data-close"]) {
      if (attrs[attr]) {
        images.push({
          attr,
          src: normalizeUrl(attrs[attr]),
          rawSrc: attrs[attr],
          alt: attrs.alt || "",
        });
      }
    }
  }
  for (const match of block.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)) {
    images.push({ attr: "background-image", src: normalizeUrl(match[1]), rawSrc: match[1], alt: "" });
  }
  return images;
}

function countMap(items) {
  const map = new Map();
  for (const item of items) map.set(item.key, (map.get(item.key) || 0) + 1);
  return map;
}

function diffAnchors(original, local) {
  const localCounts = countMap(local);
  const originalCounts = countMap(original);
  const missing = [];
  const extra = [];

  for (const item of original) {
    const count = localCounts.get(item.key) || 0;
    if (count > 0) {
      localCounts.set(item.key, count - 1);
    } else if (!allowedRemovedLabels.has(item.text)) {
      missing.push(item);
    }
  }

  for (const item of local) {
    const count = originalCounts.get(item.key) || 0;
    if (count > 0) {
      originalCounts.set(item.key, count - 1);
    } else {
      extra.push(item);
    }
  }

  return { missing, extra };
}

function diffImages(original, local) {
  const originalKeys = new Set(original.map((img) => `${img.attr}:${img.src}`));
  const localKeys = new Set(local.map((img) => `${img.attr}:${img.src}`));
  return {
    missing: original.filter((img) => !localKeys.has(`${img.attr}:${img.src}`)),
    extra: local.filter((img) => !originalKeys.has(`${img.attr}:${img.src}`)),
  };
}

async function checkUrl(path) {
  if (!path || /^(javascript:|mailto:|tel:|#)/i.test(path)) {
    return { path, skipped: true };
  }
  const external = /^https?:\/\//i.test(path);
  const url = external ? path : `${localBase}${path}`;
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "manual" });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { method: "GET", redirect: "manual" });
    }
    return { path, external, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (error) {
    return { path, external, ok: false, error: error.message };
  }
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const originalHtml = await fs.readFile(originalFile, "utf8");
const localHtml = await fs.readFile(localFile, "utf8");
const report = { checkedAt: new Date().toISOString(), sections: {} };

for (const section of ["header", "footer"]) {
  const originalBlock = stripComments(extractBlock(originalHtml, section));
  const localBlock = stripComments(extractBlock(localHtml, section));
  const originalAnchors = extractAnchors(originalBlock);
  const localAnchors = extractAnchors(localBlock);
  const originalImages = extractImages(originalBlock);
  const localImages = extractImages(localBlock);
  const anchorDiff = diffAnchors(originalAnchors, localAnchors);
  const imageDiff = diffImages(originalImages, localImages);
  const localLinks = uniqueBy(localAnchors, (anchor) => anchor.href).map((anchor) => anchor.href);
  const localImageUrls = uniqueBy(localImages, (image) => image.src).map((image) => image.src);

  const linkChecks = await Promise.all(localLinks.map(checkUrl));
  const imageChecks = await Promise.all(localImageUrls.map(checkUrl));

  report.sections[section] = {
    originalAnchorCount: originalAnchors.length,
    localAnchorCount: localAnchors.length,
    missingAnchorCount: anchorDiff.missing.length,
    extraAnchorCount: anchorDiff.extra.length,
    originalImageCount: originalImages.length,
    localImageCount: localImages.length,
    missingImageCount: imageDiff.missing.length,
    extraImageCount: imageDiff.extra.length,
    brokenLocalLinkCount: linkChecks.filter((check) => !check.skipped && !check.ok).length,
    brokenLocalInternalLinkCount: linkChecks.filter((check) => !check.skipped && !check.external && !check.ok).length,
    brokenLocalExternalLinkCount: linkChecks.filter((check) => !check.skipped && check.external && !check.ok).length,
    brokenLocalImageCount: imageChecks.filter((check) => !check.skipped && !check.ok).length,
    missingAnchors: anchorDiff.missing.slice(0, 100),
    extraAnchors: anchorDiff.extra.slice(0, 100),
    missingImages: imageDiff.missing.slice(0, 50),
    extraImages: imageDiff.extra.slice(0, 50),
    brokenLocalLinks: linkChecks.filter((check) => !check.skipped && !check.ok).slice(0, 100),
    brokenLocalImages: imageChecks.filter((check) => !check.skipped && !check.ok).slice(0, 100),
  };
}

await fs.writeFile("tmp/header-footer-audit-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
