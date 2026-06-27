import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import { applyBranding, stripCapturedHeaderFooter } from "./homepage-shell";

// Public URL slug -> captured HTML file (under data/captured-company). The legal
// pages keep their original capture file names but are served on Viraaya-branded
// slugs with no "twc-" prefix.
const captureFileBySlug = {
  "careers": "careers",
  "contact-us": "contact-us",
  "partner-onboarding-form": "partner-onboarding-form",
  "client-terms": "twc-client-terms",
  "vendor-terms": "twc-vendor-terms",
  "privacy-policy": "twc-privacy-policy",
  "refund-policy": "twc-refund-policy",
  "wedding-payment-plan": "wedding-payment-plan",
  "about-us": "about-us",
  "price-beat-challenge": "price-beat-challenge",
  "wedding-invitation-card": "wedding-invitation-card",
  "wedding": "wedding",
  "wedding-services": "wedding-services"
} as const;

export type CompanySlug = keyof typeof captureFileBySlug;

export const companyPageSlugs = Object.keys(captureFileBySlug) as CompanySlug[];

const legacyPages = new Set<CompanySlug>([
  "careers",
  "contact-us",
  "partner-onboarding-form",
  "privacy-policy",
  "wedding-invitation-card"
]);

const legacyStylesheet =
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/css/betterhalf-ai-landing-page.webflow.shared.4c23e6735.css";
const legacyWebflowScripts = [
  "https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=60222e72b5a2043efe117253",
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/js/webflow.schunk.f2efb3c5440a81cf.js",
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/js/webflow.schunk.9b8ec8d47c25ad70.js",
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/js/webflow.65c80910.3b625490ee957430.js"
];

function readCapture(slug: CompanySlug) {
  const file = path.join(
    process.cwd(),
    "data",
    "captured-company",
    `${captureFileBySlug[slug]}.html`
  );
  const html = fs.readFileSync(file, "utf8");

  if (legacyPages.has(slug)) {
    const bodyStart = html.indexOf("<body");
    const contentStart = html.indexOf(">", bodyStart) + 1;
    const contentEnd = html.lastIndexOf("</body>");

    return applyBranding(stripCapturedHeaderFooter(html
      .slice(contentStart, contentEnd)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replaceAll('href="https://www.theweddingcompany.com/', 'href="/')
      .replaceAll('href="https://wf.betterhalf.ai/', 'href="/')));
  }

  const appStart = html.indexOf('<div id="__next">');
  const portalStart = html.indexOf('<div id="portal">', appStart);
  const bodyEnd = html.lastIndexOf("</body>");

  if (appStart === -1 || (portalStart === -1 && bodyEnd === -1)) {
    throw new Error(`Could not locate the captured app markup for ${slug}.`);
  }

  return applyBranding(stripCapturedHeaderFooter(html
    .slice(appStart, portalStart === -1 ? bodyEnd : portalStart)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replaceAll('src="/_next/static/', 'src="/twc-next/static/')
    .replaceAll('srcset="/_next/static/', 'srcset="/twc-next/static/')
    .replaceAll('href="/_next/static/', 'href="/twc-next/static/')
    .replaceAll('href="https://www.theweddingcompany.com/', 'href="/')));
}

export function CompanyPage({ slug }: { slug: CompanySlug }) {
  const legacy = legacyPages.has(slug);
  const markup = readCapture(slug);

  return (
    <>
      {legacy ? <link rel="stylesheet" href={legacyStylesheet} /> : null}
      <div
        className={legacy ? "twc-captured-webflow" : "twc-captured-next"}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      {legacy
        ? legacyWebflowScripts.map((src) => (
            <Script key={src} src={src} strategy="afterInteractive" />
          ))
        : null}
    </>
  );
}
