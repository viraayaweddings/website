import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const original = fs.readFileSync(path.join(root, "tmp/vivahnam-homepage-current.html"), "utf8");
const localBase = "http://127.0.0.1:3002";

const allowedMissingKeys = new Set([
  "Abroad Venues -> /hotel-listing?country=abroad",
]);
const allowedIntentionalHeaderFixes = new Map([
  ["Hotels -> #", "Hotels -> /hotel-listing"],
  ["Services -> #", "Services -> /wedding-consultation"],
]);
const allowedAssetSwaps = new Set([
  "/user/assets/images/logo.jpg",
  "/user/assets/images/logo.png",
  "/user/assets/images/logo-white.png",
  "/user/assets/images/logo-footer.png",
]);

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function block(html, tag) {
  return stripComments((html.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "i")) || [""])[0]);
}

function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&rsquo;/g, "'")
    .replace(/&copy;/g, "©")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function text(html) {
  return decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(['"])(.*?)\2/g)) out[m[1].toLowerCase()] = decode(m[3]);
  return out;
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

function anchors(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const a = attrs(`<a ${m[1]}>`);
    const label = text(m[2]);
    const href = normalizeUrl(a.href || "");
    out.push({ text: label, href, key: `${label} -> ${href}` });
  }
  return out;
}

function images(html) {
  const out = [];
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const a = attrs(`<img ${m[1]}>`);
    for (const name of ["src", "data-menu", "data-close"]) {
      if (a[name]) out.push({ attr: name, src: normalizeUrl(a[name]), key: `${name}:${normalizeUrl(a[name])}` });
    }
  }
  for (const m of html.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)) {
    out.push({ attr: "background-image", src: normalizeUrl(m[1]), key: `background-image:${normalizeUrl(m[1])}` });
  }
  return out;
}

function count(items) {
  const m = new Map();
  for (const item of items) m.set(item.key, (m.get(item.key) || 0) + 1);
  return m;
}

function diff(canonical, local) {
  const localCounts = count(local);
  const canonicalCounts = count(canonical);
  const missing = [];
  const extra = [];
  for (const item of canonical) {
    const c = localCounts.get(item.key) || 0;
    if (c > 0) localCounts.set(item.key, c - 1);
    else missing.push(item);
  }
  for (const item of local) {
    const c = canonicalCounts.get(item.key) || 0;
    if (c > 0) canonicalCounts.set(item.key, c - 1);
    else extra.push(item);
  }
  return { missing, extra };
}

function equivalentMissing(missing, extra) {
  const extraKeys = new Set(extra.map((item) => item.key));
  return missing.filter((item) => {
    if (allowedMissingKeys.has(item.key)) return true;
    const replacement = allowedIntentionalHeaderFixes.get(item.key);
    if (replacement && extraKeys.has(replacement)) return true;
    if (!item.text && /^https?:\/\//.test(item.href)) {
      return true;
    }
    return false;
  });
}

function equivalentExtra(extra) {
  return extra.filter((item) => {
    if ([...allowedIntentionalHeaderFixes.values()].includes(item.key)) return true;
    if (!item.text && /^https?:\/\//.test(item.href)) {
      return true;
    }
    return false;
  });
}

async function checkLocalPath(href) {
  if (!href || /^(javascript:|mailto:|tel:|#|https?:\/\/)/i.test(href)) return null;
  try {
    let res = await fetch(`${localBase}${href}`, { method: "HEAD", redirect: "manual" });
    if (res.status === 405 || res.status === 403) res = await fetch(`${localBase}${href}`, { method: "GET", redirect: "manual" });
    return { href, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (error) {
    return { href, ok: false, error: error.message };
  }
}

const canonical = {
  header: { anchors: anchors(block(original, "header")), images: images(block(original, "header")) },
  footer: { anchors: anchors(block(original, "footer")), images: images(block(original, "footer")) },
};

const files = execFileSync("rg", ["--files", "site-public", "-g", "index.html"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const pages = [];
const internalHrefs = new Set();

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const page = { file, hasHeader: /<header\b/i.test(html), hasFooter: /<footer\b/i.test(html), issues: {} };
  for (const section of ["header", "footer"]) {
    const b = block(html, section);
    if (!b) continue;
    const localAnchors = anchors(b);
    const localImages = images(b);
    for (const a of localAnchors) internalHrefs.add(a.href);
    for (const img of localImages) internalHrefs.add(img.src);
    const anchorDiff = diff(canonical[section].anchors, localAnchors);
    const imageDiff = diff(canonical[section].images, localImages);
    const acceptableMissing = new Set(equivalentMissing(anchorDiff.missing, anchorDiff.extra).map((x) => x.key));
    const acceptableExtra = new Set(equivalentExtra(anchorDiff.extra).map((x) => x.key));
    page.issues[section] = {
      anchorCount: localAnchors.length,
      imageCount: localImages.length,
      unexpectedMissingAnchors: anchorDiff.missing.filter((x) => !acceptableMissing.has(x.key)),
      unexpectedExtraAnchors: anchorDiff.extra.filter((x) => !acceptableExtra.has(x.key)),
      unexpectedMissingImages: imageDiff.missing.filter((x) => !allowedAssetSwaps.has(x.src)),
      unexpectedExtraImages: imageDiff.extra.filter((x) => !allowedAssetSwaps.has(x.src)),
    };
  }
  pages.push(page);
}

const localCheckTargets = [...internalHrefs].filter((href) => href && !/^(javascript:|mailto:|tel:|#|https?:\/\/)/i.test(href));
const linkChecks = (await Promise.all(localCheckTargets.map(checkLocalPath))).filter(Boolean);
const brokenInternalTargets = linkChecks.filter((x) => !x.ok);
const pagesWithIssues = pages.filter((page) =>
  Object.values(page.issues).some((section) =>
    section.unexpectedMissingAnchors.length ||
    section.unexpectedExtraAnchors.length ||
    section.unexpectedMissingImages.length ||
    section.unexpectedExtraImages.length,
  ),
);

const report = {
  checkedAt: new Date().toISOString(),
  fileCount: files.length,
  pagesWithHeader: pages.filter((p) => p.hasHeader).length,
  pagesWithFooter: pages.filter((p) => p.hasFooter).length,
  pagesWithUnexpectedIssues: pagesWithIssues.length,
  checkedInternalTargets: localCheckTargets.length,
  brokenInternalTargetCount: brokenInternalTargets.length,
  brokenInternalTargets,
  pagesWithIssues: pagesWithIssues.slice(0, 100),
};

fs.writeFileSync(path.join(root, "tmp/site-header-footer-pages-audit-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
