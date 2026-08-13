import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const originalBase = "https://www.vivahnam.com";
const localBase = "http://127.0.0.1:3002";

const routes = [
  "/wedding-packages",
  "/package",
  "/wedding-packages/siddhi",
  "/wedding-packages/shresht",
  "/wedding-packages/shobhana",
  "/hotel-listing",
  "/hotel-cost-calculator",
  "/check-hotel-availability",
  "/wedding-consultation",
  "/real-weddings",
  "/real-weddings/aarav-meera",
  "/real-weddings/kashyap-prachi",
  "/real-weddings/ramneek-harleen",
  "/real-weddings/rohan-aanya",
  "/about-us",
  "/contact",
];

function decode(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&rsquo;/g, "'")
    .replace(/&copy;/g, "©")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeWhitespace(text) {
  return decode(text).replace(/\s+/g, " ").trim();
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function normalizeUrl(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^(javascript:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, originalBase);
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

function attrMap(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(['"])(.*?)\2/g)) {
    attrs[match[1].toLowerCase()] = decode(match[3]);
  }
  return attrs;
}

function mainHtml(html) {
  const noComments = stripComments(html);
  const main = noComments.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || noComments;
  return main
    .replace(/<header\b[\s\S]*?<\/header>/gi, "")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function textOf(html) {
  return normalizeWhitespace(html.replace(/<[^>]+>/g, " "));
}

function extractHeadings(html) {
  const out = [];
  for (const match of html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const value = textOf(match[2]);
    if (value) out.push({ tag: match[1].toLowerCase(), text: value });
  }
  return out;
}

function extractAnchors(html) {
  const out = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = attrMap(`<a ${match[1]}>`);
    const label = textOf(match[2]);
    const href = normalizeUrl(attrs.href || "");
    if (label || href) out.push({ text: label, href, key: `${label} -> ${href}` });
  }
  return out;
}

function extractButtons(html) {
  const out = [];
  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const label = textOf(match[2]);
    const attrs = attrMap(`<button ${match[1]}>`);
    if (label) out.push({ text: label, type: attrs.type || "" });
  }
  return out;
}

function extractImages(html) {
  const out = [];
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = attrMap(`<img ${match[1]}>`);
    if (attrs.src) out.push({ src: normalizeUrl(attrs.src), alt: attrs.alt || "" });
  }
  for (const match of html.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)) {
    out.push({ src: normalizeUrl(match[1]), alt: "" });
  }
  return out;
}

function extractForms(html) {
  const forms = [];
  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = attrMap(`<form ${match[1]}>`);
    const fields = [];
    for (const fieldMatch of match[2].matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
      const fieldAttrs = attrMap(`<${fieldMatch[1]} ${fieldMatch[2]}>`);
      fields.push({
        tag: fieldMatch[1].toLowerCase(),
        name: fieldAttrs.name || "",
        id: fieldAttrs.id || "",
        type: fieldAttrs.type || "",
        placeholder: fieldAttrs.placeholder || "",
        required: "required" in fieldAttrs,
      });
    }
    forms.push({
      action: normalizeUrl(attrs.action || ""),
      method: (attrs.method || "get").toLowerCase(),
      id: attrs.id || "",
      fields,
    });
  }
  return forms;
}

function extractSections(html) {
  return [...html.matchAll(/<(section|div)\b([^>]*)>/gi)]
    .map((match) => attrMap(`<${match[1]} ${match[2]}>`).class || "")
    .filter((className) => /\b(section|banner|hero|wrapper|main|content|form|package|wedding|contact|about|service)\b/i.test(className));
}

function countMap(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function multisetDiff(original, local, keyFn) {
  const localCounts = countMap(local, keyFn);
  const originalCounts = countMap(original, keyFn);
  const missing = [];
  const extra = [];
  for (const item of original) {
    const key = keyFn(item);
    const count = localCounts.get(key) || 0;
    if (count) localCounts.set(key, count - 1);
    else missing.push(item);
  }
  for (const item of local) {
    const key = keyFn(item);
    const count = originalCounts.get(key) || 0;
    if (count) originalCounts.set(key, count - 1);
    else extra.push(item);
  }
  return { missing, extra };
}

function equivalentText(value) {
  return normalizeWhitespace(value)
    .replace(/\bVivahnam(?:\.com)?\b/gi, "BRAND")
    .replace(/\bViraaya Weddings(?:\.com)?\b/gi, "BRAND")
    .replace(/\bviraayaweddings\.com\b/gi, "BRAND")
    .replace(/\b500\+\b/g, "COUNT")
    .replace(/\b250\+\b/g, "COUNT");
}

function summarize(html) {
  const main = mainHtml(html);
  return {
    sections: extractSections(main),
    headings: extractHeadings(main),
    anchors: extractAnchors(main),
    buttons: extractButtons(main),
    images: extractImages(main),
    forms: extractForms(main),
    textLength: textOf(main).length,
  };
}

async function fetchHtml(base, route) {
  const response = await fetch(`${base}${route}`, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Codex menu page audit",
    },
  });
  const text = await response.text();
  return { status: response.status, html: text, ok: response.status >= 200 && response.status < 400 };
}

async function checkLocalUrl(href) {
  if (!href || /^(javascript:|mailto:|tel:|#|https?:\/\/)/i.test(href)) return null;
  try {
    let response = await fetch(`${localBase}${href}`, { method: "HEAD", redirect: "manual" });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(`${localBase}${href}`, { method: "GET", redirect: "manual" });
    }
    return { href, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch (error) {
    return { href, ok: false, error: error.message };
  }
}

async function checkLocalImage(src) {
  if (!src || /^(data:|https?:\/\/)/i.test(src)) return null;
  try {
    let response = await fetch(`${localBase}${src}`, { method: "HEAD", redirect: "manual" });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(`${localBase}${src}`, { method: "GET", redirect: "manual" });
    }
    return { src, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch (error) {
    return { src, ok: false, error: error.message };
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  routes: [],
};

await fs.mkdir(path.join(root, "tmp/menu-page-html/original"), { recursive: true });
await fs.mkdir(path.join(root, "tmp/menu-page-html/local"), { recursive: true });

for (const route of routes) {
  const [original, local] = await Promise.all([
    fetchHtml(originalBase, route),
    fetchHtml(localBase, route),
  ]);
  const slug = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/[\/?=&%]+/g, "__");
  await fs.writeFile(path.join(root, "tmp/menu-page-html/original", `${slug}.html`), original.html);
  await fs.writeFile(path.join(root, "tmp/menu-page-html/local", `${slug}.html`), local.html);

  const originalSummary = summarize(original.html);
  const localSummary = summarize(local.html);
  const headingDiff = multisetDiff(
    originalSummary.headings.map((h) => ({ ...h, comparable: `${h.tag}:${equivalentText(h.text)}` })),
    localSummary.headings.map((h) => ({ ...h, comparable: `${h.tag}:${equivalentText(h.text)}` })),
    (h) => h.comparable,
  );
  const ctaDiff = multisetDiff(originalSummary.anchors, localSummary.anchors, (a) => `${equivalentText(a.text)} -> ${a.href}`);
  const formDiff = multisetDiff(originalSummary.forms, localSummary.forms, (f) =>
    `${f.method}:${f.action}:${f.fields.map((field) => `${field.tag}:${field.name}:${field.id}:${field.type}:${field.required}`).join("|")}`,
  );
  const imageDiff = multisetDiff(originalSummary.images, localSummary.images, (img) => `${img.src}:${equivalentText(img.alt)}`);

  const localLinks = [...new Set(localSummary.anchors.map((a) => a.href))];
  const localImages = [...new Set(localSummary.images.map((img) => img.src))];
  const [linkChecks, imageChecks] = await Promise.all([
    Promise.all(localLinks.map(checkLocalUrl)),
    Promise.all(localImages.map(checkLocalImage)),
  ]);

  report.routes.push({
    route,
    originalStatus: original.status,
    localStatus: local.status,
    textLength: {
      original: originalSummary.textLength,
      local: localSummary.textLength,
    },
    counts: {
      sections: { original: originalSummary.sections.length, local: localSummary.sections.length },
      headings: { original: originalSummary.headings.length, local: localSummary.headings.length },
      ctas: { original: originalSummary.anchors.length, local: localSummary.anchors.length },
      buttons: { original: originalSummary.buttons.length, local: localSummary.buttons.length },
      images: { original: originalSummary.images.length, local: localSummary.images.length },
      forms: { original: originalSummary.forms.length, local: localSummary.forms.length },
    },
    diffs: {
      missingHeadings: headingDiff.missing.slice(0, 50),
      extraHeadings: headingDiff.extra.slice(0, 50),
      missingCtas: ctaDiff.missing.slice(0, 50),
      extraCtas: ctaDiff.extra.slice(0, 50),
      missingForms: formDiff.missing.slice(0, 20),
      extraForms: formDiff.extra.slice(0, 20),
      missingImages: imageDiff.missing.slice(0, 50),
      extraImages: imageDiff.extra.slice(0, 50),
    },
    localHealth: {
      brokenLinks: linkChecks.filter((check) => check && !check.ok),
      brokenImages: imageChecks.filter((check) => check && !check.ok),
    },
  });
}

report.summary = {
  routesChecked: report.routes.length,
  routesNotOk: report.routes.filter((route) => !route.originalStatus || route.originalStatus >= 400 || route.localStatus >= 400).map((route) => route.route),
  routesWithBrokenLocalLinks: report.routes.filter((route) => route.localHealth.brokenLinks.length).map((route) => route.route),
  routesWithBrokenLocalImages: report.routes.filter((route) => route.localHealth.brokenImages.length).map((route) => route.route),
  routesWithFormDiffs: report.routes.filter((route) => route.diffs.missingForms.length || route.diffs.extraForms.length).map((route) => route.route),
  routesWithHeadingDiffs: report.routes.filter((route) => route.diffs.missingHeadings.length || route.diffs.extraHeadings.length).map((route) => route.route),
  routesWithCtaDiffs: report.routes.filter((route) => route.diffs.missingCtas.length || route.diffs.extraCtas.length).map((route) => route.route),
  routesWithImageDiffs: report.routes.filter((route) => route.diffs.missingImages.length || route.diffs.extraImages.length).map((route) => route.route),
};

await fs.writeFile(path.join(root, "tmp/menu-scope-pages-audit-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
