import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const originalBase = "https://www.vivahnam.com";
const localBase = "http://127.0.0.1:3002";

function normalizePath(file) {
  return file.replace(/\\/g, "/");
}

function routeFromFile(file) {
  return "/" + normalizePath(file).replace(/^site-public\//, "").replace(/\/index\.html$/, "");
}

const destinationFiles = execFileSync("rg", ["--files", "site-public/destination-wedding", "-g", "index.html"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map(normalizePath);

const cityRoutes = destinationFiles
  .filter((file) => file.split("/").length === 4)
  .map(routeFromFile)
  .sort();
const hotelRoutes = destinationFiles
  .filter((file) => file.split("/").length === 5)
  .map(routeFromFile)
  .sort();
const routes = ["/hotel-listing", ...cityRoutes, ...hotelRoutes];

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

function normalizeUrl(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^(javascript:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, originalBase);
    if (url.hostname === "www.vivahnam.com" || url.hostname === "vivahnam.com") return `${url.pathname}${url.search}${url.hash}` || "/";
    if (url.hostname === "www.learningtlms.in" && url.pathname.startsWith("/vivahnam/")) return url.pathname.replace(/^\/vivahnam/, "") + url.search + url.hash;
    return url.href;
  } catch {
    return trimmed;
  }
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(['"])(.*?)\2/g)) out[match[1].toLowerCase()] = decode(match[3]);
  return out;
}

function mainHtml(html) {
  return (html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<header\b[\s\S]*?<\/header>/gi, "")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function textOf(html) {
  return normalizeWhitespace(html.replace(/<[^>]+>/g, " "));
}

function collect(html, regex, mapper) {
  return [...html.matchAll(regex)].map(mapper).filter(Boolean);
}

function summarize(html) {
  const main = mainHtml(html);
  const headings = collect(main, /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi, (m) => {
    const text = textOf(m[2]);
    return text ? { tag: m[1].toLowerCase(), text } : null;
  });
  const anchors = collect(main, /<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m) => {
    const a = attrs(`<a ${m[1]}>`);
    const text = textOf(m[2]);
    const href = normalizeUrl(a.href || "");
    return text || href ? { text, href } : null;
  });
  const images = [
    ...collect(main, /<img\b([^>]*)>/gi, (m) => {
      const a = attrs(`<img ${m[1]}>`);
      return a.src ? { src: normalizeUrl(a.src), alt: a.alt || "" } : null;
    }),
    ...collect(main, /background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi, (m) => ({ src: normalizeUrl(m[1]), alt: "" })),
  ];
  const forms = collect(main, /<form\b([^>]*)>([\s\S]*?)<\/form>/gi, (m) => {
    const a = attrs(`<form ${m[1]}>`);
    const fields = collect(m[2], /<(input|select|textarea)\b([^>]*)>/gi, (fm) => {
      const fa = attrs(`<${fm[1]} ${fm[2]}>`);
      return { tag: fm[1].toLowerCase(), name: fa.name || "", id: fa.id || "", type: fa.type || "", required: "required" in fa };
    });
    return { action: normalizeUrl(a.action || ""), method: (a.method || "get").toLowerCase(), id: a.id || "", fields };
  });
  return {
    textLength: textOf(main).length,
    headings,
    anchors,
    images,
    forms,
    interactive: {
      dropdowns: (html.match(/data-bs-toggle=["']dropdown["']/gi) || []).length,
      tabs: (html.match(/data-bs-toggle=["'](?:tab|pill)["']/gi) || []).length,
      carousels: (html.match(/\b(?:owl-carousel|swiper|slick|carousel)\b/gi) || []).length,
      accordions: (html.match(/\baccordion\b/gi) || []).length,
      sliders: (html.match(/\b(?:slider|range|owl-carousel|swiper|slick)\b/gi) || []).length,
      filters: (html.match(/\b(?:filter|hotelSearch|cityMultiSelect|select2)\b/gi) || []).length,
    },
  };
}

function keyText(value) {
  return normalizeWhitespace(value)
    .replace(/\bVivahnam(?:\.com)?\b/gi, "BRAND")
    .replace(/\bViraaya Weddings(?:\.com)?\b/gi, "BRAND")
    .replace(/\b500\+\b/g, "COUNT")
    .replace(/\b250\+\b/g, "COUNT")
    .replace(/\bGlobal\b/gi, "SCOPE")
    .replace(/\bIndian\b/gi, "SCOPE");
}

function diff(original, local, key) {
  const localCounts = new Map();
  const originalCounts = new Map();
  for (const item of local) localCounts.set(key(item), (localCounts.get(key(item)) || 0) + 1);
  for (const item of original) originalCounts.set(key(item), (originalCounts.get(key(item)) || 0) + 1);
  const missing = [];
  const extra = [];
  for (const item of original) {
    const k = key(item);
    const count = localCounts.get(k) || 0;
    if (count) localCounts.set(k, count - 1);
    else missing.push(item);
  }
  for (const item of local) {
    const k = key(item);
    const count = originalCounts.get(k) || 0;
    if (count) originalCounts.set(k, count - 1);
    else extra.push(item);
  }
  return { missing, extra };
}

async function fetchHtml(base, route) {
  const res = await fetch(`${base}${route}`, { headers: { accept: "text/html", "user-agent": "Codex hotels audit" } });
  const html = await res.text();
  return { route, status: res.status, ok: res.status >= 200 && res.status < 400, html };
}

async function readLocalHtml(route) {
  const filePath = route === "/"
    ? path.join(root, "site-public/index.html")
    : path.join(root, "site-public", route.replace(/^\//, ""), "index.html");
  try {
    return { route, status: 200, ok: true, html: await fs.readFile(filePath, "utf8"), filePath };
  } catch (error) {
    return { route, status: 0, ok: false, html: "", filePath, error: error.message };
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

async function checkLocalUrl(url, kind) {
  if (!url || /^(javascript:|mailto:|tel:|#|https?:\/\/|data:)/i.test(url)) return null;
  const withoutQuery = url.split(/[?#]/)[0];
  const candidates = [];
  if (/\.[a-z0-9]{2,5}$/i.test(withoutQuery)) {
    candidates.push(path.join(root, "site-public", withoutQuery.replace(/^\//, "")));
  } else {
    candidates.push(path.join(root, "site-public", withoutQuery.replace(/^\//, ""), "index.html"));
    candidates.push(path.join(root, "site-public", `${withoutQuery.replace(/^\//, "")}.html`));
  }
  const checks = await Promise.all(candidates.map((candidate) => fs.stat(candidate).then((stat) => stat.isFile()).catch(() => false)));
  const ok = checks.some(Boolean);
  return { kind, url, status: ok ? 200 : 404, ok };
}

const routeReports = await mapLimit(routes, 12, async (route) => {
  const [original, local] = await Promise.all([fetchHtml(originalBase, route), readLocalHtml(route)]);
  const originalSummary = summarize(original.html);
  const localSummary = summarize(local.html);
  const headingDiff = diff(originalSummary.headings, localSummary.headings, (h) => `${h.tag}:${keyText(h.text)}`);
  const ctaDiff = diff(originalSummary.anchors, localSummary.anchors, (a) => `${keyText(a.text)} -> ${a.href}`);
  const formDiff = diff(originalSummary.forms, localSummary.forms, (f) => `${f.method}:${f.action}:${f.fields.map((x) => `${x.tag}:${x.name}:${x.id}:${x.type}:${x.required}`).join("|")}`);
  const imageDiff = diff(originalSummary.images, localSummary.images, (img) => `${img.src}:${keyText(img.alt)}`);
  const healthTargets = [
    ...new Set(localSummary.anchors.map((a) => a.href)),
    ...new Set(localSummary.images.map((i) => i.src)),
  ];
  const health = (await Promise.all(healthTargets.map((target) => checkLocalUrl(target, "target")))).filter(Boolean);
  return {
    route,
    status: { original: original.status, local: local.status },
    counts: {
      headings: { original: originalSummary.headings.length, local: localSummary.headings.length },
      ctas: { original: originalSummary.anchors.length, local: localSummary.anchors.length },
      images: { original: originalSummary.images.length, local: localSummary.images.length },
      forms: { original: originalSummary.forms.length, local: localSummary.forms.length },
      interactive: { original: originalSummary.interactive, local: localSummary.interactive },
    },
    diffCounts: {
      headings: headingDiff.missing.length + headingDiff.extra.length,
      ctas: ctaDiff.missing.length + ctaDiff.extra.length,
      images: imageDiff.missing.length + imageDiff.extra.length,
      forms: formDiff.missing.length + formDiff.extra.length,
    },
    samples: {
      missingHeadings: headingDiff.missing.slice(0, 10),
      extraHeadings: headingDiff.extra.slice(0, 10),
      missingCtas: ctaDiff.missing.slice(0, 10),
      extraCtas: ctaDiff.extra.slice(0, 10),
      missingImages: imageDiff.missing.slice(0, 10),
      extraImages: imageDiff.extra.slice(0, 10),
      missingForms: formDiff.missing.slice(0, 5),
      extraForms: formDiff.extra.slice(0, 5),
    },
    health: {
      broken: health.filter((x) => !x.ok),
    },
  };
});

const report = {
  checkedAt: new Date().toISOString(),
  scope: {
    routes: routes.length,
    cityRoutes: cityRoutes.length,
    hotelRoutes: hotelRoutes.length,
  },
  summary: {
    routeStatusFailures: routeReports.filter((r) => r.status.original >= 400 || r.status.local >= 400).map((r) => r.route),
    routesWithBrokenTargets: routeReports.filter((r) => r.health.broken.length).map((r) => r.route),
    totalBrokenTargets: routeReports.reduce((sum, r) => sum + r.health.broken.length, 0),
    routesWithHeadingDiffs: routeReports.filter((r) => r.diffCounts.headings).length,
    routesWithCtaDiffs: routeReports.filter((r) => r.diffCounts.ctas).length,
    routesWithImageDiffs: routeReports.filter((r) => r.diffCounts.images).length,
    routesWithFormDiffs: routeReports.filter((r) => r.diffCounts.forms).length,
  },
  routes: routeReports,
};

await fs.writeFile(path.join(root, "tmp/hotels-scope-pages-audit-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
