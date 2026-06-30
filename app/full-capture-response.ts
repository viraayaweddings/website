import fs from "node:fs";
import path from "node:path";
import {
  applyBranding,
  applyHomepageHeaderFooter,
  homepageShellCss,
  homepageShellScript
} from "./homepage-shell";

const localAssetOrigins: Array<[string, string]> = [
  ["https://gcpimages.theweddingcompany.com/", "/venue-assets/gcpimages/"],
  ["https://imageswedding.theweddingcompany.com/", "/venue-assets/imageswedding/"],
  ["https://weddingimage.betterhalf.ai/", "/venue-assets/weddingimage/"],
  ["https://maps.gstatic.com/", "/venue-assets/maps/"],
  ["https://cdn.prod.website-files.com/", "/venue-assets/webflowcdn/"],
  ["https://assets-global.website-files.com/", "/venue-assets/webflowassets/"]
];
const homepageStylesheets = [
  "/twc-next/static/css/5baa3d17e8de8438.css",
  "/twc-next/static/css/c8c1bcda263ddb1a.css",
  "/twc-next/static/css/ef46db3751d8e999.css",
  "/twc-next/static/css/ec70c9af02a4e84a.css",
  "/twc-next/static/css/61dbd837b13489b4.css"
];

const fullCaptureCache = new Map<string, string>();
const fullCaptureShellVersion = "single-shell-v12-shared-home-header-footer";

function rewriteAssetUrls(html: string) {
  let next = html
    .replaceAll('href="/_next/static/', 'href="/twc-next/static/')
    .replaceAll('src="/_next/static/', 'src="/twc-next/static/')
    .replaceAll('srcset="/_next/static/', 'srcset="/twc-next/static/');

  for (const [remote, local] of localAssetOrigins) {
    next = next.replaceAll(remote, local);
  }

  return next;
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

function injectHomepageAssets(html: string) {
  const stylesheetMarkup = homepageStylesheets
    .filter((href) => !html.includes(`href="${href}"`))
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join("");

  const headMarkup = `${stylesheetMarkup}${homepageShellCss}`;
  return html.replace("</head>", `${headMarkup}</head>`);
}

const imageProxyScript = `
<script>
(() => {
  const oldDomain = "thewedding" + "company" + ".com";
  const replacements = [
    ["https://gcpimages." + oldDomain + "/", "/venue-assets/gcpimages/"],
    ["https://imageswedding." + oldDomain + "/", "/venue-assets/imageswedding/"],
    ["https://weddingimage.betterhalf.ai/", "/venue-assets/weddingimage/"],
    ["https://maps.gstatic.com/", "/venue-assets/maps/"],
    ["https://cdn.prod.website-files.com/", "/venue-assets/webflowcdn/"],
    ["https://assets-global.website-files.com/", "/venue-assets/webflowassets/"]
  ];
  const rewrite = (value) => {
    if (!value || typeof value !== "string") return value;
    let next = value;
    for (const [remote, local] of replacements) next = next.split(remote).join(local);
    return next;
  };
  const patchElement = (element) => {
    if (!element || !element.getAttribute) return;
    for (const attr of ["src", "srcset", "poster"]) {
      const value = element.getAttribute(attr);
      const nextValue = rewrite(value);
      if (nextValue && nextValue !== value) element.setAttribute(attr, nextValue);
    }
  };
  const patchTree = (root) => {
    patchElement(root);
    if (root && root.querySelectorAll) {
      root.querySelectorAll("img,source,video").forEach(patchElement);
    }
  };
  const sweep = () => patchTree(document);
  sweep();
  [120, 400, 1000, 2500].forEach((delay) => setTimeout(sweep, delay));
})();
</script>`;

export function fullCaptureResponse(slug: string) {
  const cacheKey = `${fullCaptureShellVersion}:${slug}`;
  const cached = fullCaptureCache.get(cacheKey);
  if (cached && process.env.NODE_ENV !== "development") {
    return new Response(cached, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
      }
    });
  }

  const file = path.join(
    process.cwd(),
    "data",
    "captured-company",
    `${slug}.html`
  );
  const html = applyBranding(applyHomepageHeaderFooter(
    injectHomepageAssets(stripExternalRuntime(rewriteAssetUrls(fs.readFileSync(file, "utf8"))))
  )).replace("</body>", `${imageProxyScript}${homepageShellScript()}</body>`);
  fullCaptureCache.set(cacheKey, html);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
