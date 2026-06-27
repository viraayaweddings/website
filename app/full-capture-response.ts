import fs from "node:fs";
import path from "node:path";
import {
  applyBranding,
  applyHomepageHeaderFooter,
  homepageShellCss,
  homepageShellScript
} from "./homepage-shell";

const imageOrigin = "https://imageswedding.theweddingcompany.com";
const homepageStylesheets = [
  "/twc-next/static/css/5baa3d17e8de8438.css",
  "/twc-next/static/css/c8c1bcda263ddb1a.css",
  "/twc-next/static/css/ef46db3751d8e999.css",
  "/twc-next/static/css/ec70c9af02a4e84a.css",
  "/twc-next/static/css/61dbd837b13489b4.css"
];

const fullCaptureCache = new Map<string, string>();

function rewriteAssetUrls(html: string) {
  return html
    .replaceAll('href="/_next/static/', 'href="/twc-next/static/')
    .replaceAll('src="/_next/static/', 'src="/twc-next/static/')
    .replaceAll('srcset="/_next/static/', 'srcset="/twc-next/static/')
    .replaceAll(`${imageOrigin}/`, "/twc-image-proxy/");
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
  const remote = "https://imageswedding." + "thewedding" + "company" + ".com/";
  const local = "/twc-image-proxy/";
  const rewrite = (value) => value && value.includes(remote)
    ? value.split(remote).join(local)
    : value;
  const patchElement = (element) => {
    if (!element || !element.getAttribute) return;
    for (const attr of ["src", "srcset"]) {
      const value = element.getAttribute(attr);
      const nextValue = rewrite(value);
      if (nextValue && nextValue !== value) element.setAttribute(attr, nextValue);
    }
  };
  const patchTree = (root) => {
    patchElement(root);
    if (root && root.querySelectorAll) {
      root.querySelectorAll("img,source").forEach(patchElement);
    }
  };
  const sweep = () => patchTree(document);
  sweep();
  [120, 400, 1000, 2500].forEach((delay) => setTimeout(sweep, delay));
})();
</script>`;

export function fullCaptureResponse(slug: string) {
  const cached = fullCaptureCache.get(slug);
  if (cached) {
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
    injectHomepageAssets(rewriteAssetUrls(fs.readFileSync(file, "utf8")))
  )).replace("</body>", `${imageProxyScript}${homepageShellScript()}</body>`);
  fullCaptureCache.set(slug, html);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
