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
  "wedding-invitation-card"
]);

const legalDocumentTitles: Partial<Record<CompanySlug, string>> = {
  "about-us": "About Us",
  "privacy-policy": "Privacy Policy"
};

const legacyStylesheet =
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/css/betterhalf-ai-landing-page.webflow.shared.4c23e6735.css";
const legacyWebflowScripts = [
  "https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=60222e72b5a2043efe117253",
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/js/webflow.schunk.f2efb3c5440a81cf.js",
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/js/webflow.schunk.9b8ec8d47c25ad70.js",
  "https://cdn.prod.website-files.com/60222e72b5a2043efe117253/js/webflow.65c80910.3b625490ee957430.js"
];

function extractBalancedDiv(markup: string, marker: string) {
  const start = markup.indexOf(marker);

  if (start === -1) {
    return "";
  }

  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = start;

  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = divTag.exec(markup))) {
    depth += match[0].startsWith("</") ? -1 : 1;

    if (depth === 0) {
      return markup.slice(start, divTag.lastIndex);
    }
  }

  return "";
}

function innerHtml(markup: string, tagName: string) {
  const contentStart = markup.indexOf(">");
  const contentEnd = markup.lastIndexOf(`</${tagName}>`);

  if (contentStart === -1 || contentEnd === -1 || contentEnd <= contentStart) {
    return "";
  }

  return markup.slice(contentStart + 1, contentEnd).trim();
}

function stripCapturedDocumentClasses(markup: string) {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "")
    .replace(/\s(?:class|style)="[^"]*"/gi, "")
    .replace(/\sdata-[\w-]+="[^"]*"/gi, "")
    .replace(/\s(?:width|height)="[^"]*"/gi, "")
    .replaceAll('href="https://www.theweddingcompany.com/', 'href="/')
    .replaceAll('href="https://wf.betterhalf.ai/', 'href="/')
    .trim();
}

function extractLegalDocumentBody(slug: CompanySlug, html: string) {
  if (slug === "privacy-policy") {
    const privacyBody = extractBalancedDiv(html, '<div class="div-block-26">');

    if (!privacyBody) {
      throw new Error("Could not locate the captured privacy policy document.");
    }

    return innerHtml(privacyBody, "div");
  }

  if (slug === "about-us") {
    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);

    if (!article) {
      throw new Error("Could not locate the captured about us document.");
    }

    return article[1].trim();
  }

  return "";
}

function renderLegalDocument(title: string, body: string) {
  const content = stripCapturedDocumentClasses(body);

  return applyBranding(`
    <div class="flex h-11 items-center justify-center bg-[#A9804E] font-plus-jakarata-sans font-semibold text-white md:h-20 md:text-xl">${title}</div>
    <article class="twc-legal-document mx-auto max-w-screen-lg px-6 py-10 font-plus-jakarata-sans text-[14px] leading-relaxed text-[#2E394A] md:px-10 md:py-14">
      <div class="space-y-6">${content}</div>
    </article>
  `);
}

function readCapture(slug: CompanySlug) {
  const file = path.join(
    process.cwd(),
    "data",
    "captured-company",
    `${captureFileBySlug[slug]}.html`
  );
  const html = fs.readFileSync(file, "utf8");
  const legalDocumentTitle = legalDocumentTitles[slug];

  if (legalDocumentTitle) {
    return renderLegalDocument(
      legalDocumentTitle,
      extractLegalDocumentBody(slug, html)
    );
  }

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
