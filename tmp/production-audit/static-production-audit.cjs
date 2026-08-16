const fs = require("fs");
const path = require("path");

const publicRoot = "site-public";
const distRoot = "dist/client";
const pageInventory = JSON.parse(fs.readFileSync("tmp/production-audit/page-inventory.json", "utf8")).pages;
const secretPattern =
  /(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|sk-(?:live|test|proj|svcacct|admin|user|key|[A-Za-z0-9]{20})[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{20,}|re_[A-Za-z0-9]{20,}|BEGIN (?:RSA|OPENSSH|PRIVATE) KEY|RESEND_API_KEY\s*=|SECRET\s*=|API_KEY\s*=)/;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else out.push(file);
  }
  return out;
}

function routeToFile(route, root = publicRoot) {
  return route === "/" ? path.join(root, "index.html") : path.join(root, route.replace(/^\//, ""), "index.html");
}

function localPathFromUrl(value) {
  if (!value || value.startsWith("data:") || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("#")) {
    return null;
  }
  if (/^https?:\/\//i.test(value) || /^\/\//.test(value) || /^javascript:/i.test(value)) return null;
  const clean = value.split("#")[0].split("?")[0];
  return clean.startsWith("/") ? clean : null;
}

const pageSet = new Set(pageInventory.concat(["/"]));
const allPublicFiles = walk(publicRoot);
const allDistFiles = walk(distRoot);
const report = {
  pages: pageInventory.length,
  missingAssets: [],
  deletedCountryLinks: [],
  brokenInternalPageLinks: [],
  rawCalculatorFiles: [],
  base64Html: [],
  oversizedHtml: [],
  largeAssets: [],
  secretFindings: [],
};

for (const route of pageInventory) {
  const file = routeToFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  const bytes = Buffer.byteLength(html);
  if (bytes > 450000) report.oversizedHtml.push({ route, bytes });
  if (/data:image\/[^;]+;base64/.test(html)) report.base64Html.push(route);

  const attrs = [...html.matchAll(/\b(?:src|href|poster|data-src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const attr of attrs) {
    const local = localPathFromUrl(attr);
    if (!local) continue;
    if (local === "/country" || local.startsWith("/country/")) report.deletedCountryLinks.push({ route, href: attr });

    const extension = path.extname(local);
    if (extension) {
      const target = path.join(publicRoot, local.replace(/^\//, ""));
      if (!fs.existsSync(target)) report.missingAssets.push({ route, asset: attr });
    } else {
      const normalizedRoute = local.replace(/\/$/, "") || "/";
      if (!pageSet.has(normalizedRoute) && !["/contact/save", "/get_in_touch/store", "/blog-form-submit"].includes(normalizedRoute)) {
        report.brokenInternalPageLinks.push({ route, href: attr });
      }
    }
  }
}

for (const file of allPublicFiles.concat(allDistFiles)) {
  const normalized = file.replace(/\\/g, "/");
  if (/\/(?:calculator-data|availability-data)\.json$/i.test(normalized)) report.rawCalculatorFiles.push(normalized);
  const size = fs.statSync(file).size;
  if (size > 1500000 && !file.endsWith(".map")) report.largeAssets.push({ file: normalized, bytes: size });
}

for (const file of allPublicFiles) {
  const normalized = file.replace(/\\/g, "/");
  if (/\.(jpg|jpeg|png|webp|gif|woff2?|ttf|ico|pdf|mp4)$/i.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (secretPattern.test(text)) {
    report.secretFindings.push({ file: normalized, matches: [...new Set((text.match(new RegExp(secretPattern, "g")) || []).slice(0, 5))] });
  }
}

fs.writeFileSync("tmp/production-audit/static-production-audit.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  pages: report.pages,
  missingAssets: report.missingAssets.length,
  deletedCountryLinks: report.deletedCountryLinks.length,
  brokenInternalPageLinks: report.brokenInternalPageLinks.length,
  rawCalculatorFiles: report.rawCalculatorFiles,
  base64Html: report.base64Html.length,
  oversizedHtml: report.oversizedHtml.length,
  largeAssets: report.largeAssets.length,
  secretFindings: report.secretFindings.length,
}, null, 2));
