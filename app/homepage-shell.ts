import fs from "node:fs";
import path from "node:path";

const brandAssets = {
  headerLogo: "/brand/viraaya-logo-header.png",
  footerLogo: "/brand/viraaya-logo-full.png",
  logoAlt: "Viraaya Weddings logo",
  name: "Viraaya Weddings",
  url: "https://viraayaweddings.com"
};

const ideaCategoryMarkup = [
  ["Lehenga", "/twc-assets/ideabook/lehenga.webp"],
  ["Decor", "/twc-assets/ideabook/decor.webp"],
  ["Makeup", "/twc-assets/ideabook/makeup.webp"],
  ["Mehendi", "/twc-assets/ideabook/mehendi.webp"],
  ["Hairstyles", "/twc-assets/ideabook/hairstyles.webp"],
  ["Photography", "/twc-assets/ideabook/photography.webp"]
]
  .map(
    ([label, src]) => `
      <div class="flex w-fit cursor-pointer flex-col items-center gap-2.5 md:gap-4" tabindex="0">
        <div class="aspect-square h-[70px] overflow-hidden rounded-full border-4 border-white shadow-circularCategoryShadow md:h-20 lg:h-28">
          <img alt="${label}" loading="lazy" width="100" height="100" decoding="async" class="h-full w-full object-cover" src="${src}" />
        </div>
        <span class="text-center text-xs font-medium text-secondary md:text-sm lg:text-lg">${label}</span>
      </div>
    `
  )
  .join("");

function elementEnd(html: string, start: number, tag: string) {
  const pattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  pattern.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    depth += match[0].startsWith(`</${tag}`) ? -1 : 1;
    if (depth === 0) {
      return pattern.lastIndex;
    }
  }

  return -1;
}

function findElementStartBefore(html: string, marker: number, tag: string) {
  return html.lastIndexOf(`<${tag}`, marker);
}

function removeFirstElement(html: string, needle: string, tag: string) {
  const start = html.indexOf(needle);
  if (start === -1) {
    return html;
  }

  const end = elementEnd(html, start, tag);
  return end === -1 ? html : html.slice(0, start) + html.slice(end);
}

function replaceFirstElement(
  html: string,
  needle: string,
  tag: string,
  replacement: string
) {
  const start = html.indexOf(needle);
  if (start === -1) {
    return html;
  }

  const end = elementEnd(html, start, tag);
  return end === -1 ? html : html.slice(0, start) + replacement + html.slice(end);
}

function transformHomepageContent(markup: string) {
  return applyBranding(markup)
    .replaceAll('style="color:#000000"', 'style="color:#ffffff"')
    .replace(
      /(<div class="keen-slider"[^>]*style="[^"]*transform:[^"]*")/g,
      (match) => match.replace(/style="[^"]*"/, "")
    )
    .replaceAll(
      "https://imageswedding.theweddingcompany.com/bh_prod_bucket/assets/ideabook/1bdff7b1-2105-4e8f-b9b9-a6e7bc746614.webp",
      "/twc-assets/ideabook/lehenga.webp"
    )
    .replaceAll(
      "https://imageswedding.theweddingcompany.com/bh_prod_bucket/assets/ideabook/905b2607-75c2-4faf-840b-f21401675091.webp",
      "/twc-assets/ideabook/decor.webp"
    )
    .replaceAll(
      "https://imageswedding.theweddingcompany.com/bh_prod_bucket/assets/ideabook/39eecfba-a408-4e4d-9cfc-02b33f271384.webp",
      "/twc-assets/ideabook/makeup.webp"
    )
    .replaceAll(
      "https://imageswedding.theweddingcompany.com/bh_prod_bucket/assets/ideabook/e8d7e732-55c2-48be-b860-8583d0a12c8b.webp",
      "/twc-assets/ideabook/mehendi.webp"
    )
    .replaceAll(
      "https://imageswedding.theweddingcompany.com/bh_prod_bucket/assets/ideabook/797ab67c-e0a1-49dc-8fd1-3bfb8da9576a.webp",
      "/twc-assets/ideabook/hairstyles.webp"
    )
    .replaceAll(
      "https://imageswedding.theweddingcompany.com/bh_prod_bucket/assets/ideabook/27ca15aa-780c-4142-a14b-bd79bf2ef47c.webp",
      "/twc-assets/ideabook/photography.webp"
    )
    .replace(
      '<a target="_blank" class="flex flex-col items-center justify-center gap-2.5 md:gap-4" id="hp-wedding-ideas"',
      `${ideaCategoryMarkup}<a target="_blank" class="flex w-fit cursor-pointer flex-col items-center gap-2.5 md:gap-4" id="hp-wedding-ideas"`
    )
    .replace(
      '<div class="flex w-full flex-col items-center justify-center rounded-full border-4 border-white bg-TWCPrimaryTheme text-base text-white shadow aspect-square h-[70px] md:h-20 lg:h-28">',
      '<div class="aspect-square h-[70px] overflow-hidden rounded-full border-4 border-white bg-TWCPrimaryTheme text-base text-white shadow-circularCategoryShadow md:h-20 lg:h-28 flex items-center justify-center">'
    );
}

function applyBrandAssets(markup: string) {
  return markup
    .replaceAll(
      "/twc-next/static/media/TheWeddingCompanyLogo_Low_Res.88e6d171.webp",
      brandAssets.headerLogo
    )
    .replaceAll(
      "/_next/static/media/TheWeddingCompanyLogo_Low_Res.88e6d171.webp",
      brandAssets.headerLogo
    )
    .replaceAll(
      "/twc-mirror/_next/static/media/TheWeddingCompanyLogo_Low_Res.88e6d171.webp",
      brandAssets.headerLogo
    )
    .replaceAll(
      "/twc-next/static/media/TheWeddingCompanyLogoVertical.b80524ce.webp",
      brandAssets.footerLogo
    )
    .replaceAll(
      "/_next/static/media/TheWeddingCompanyLogoVertical.b80524ce.webp",
      brandAssets.footerLogo
    )
    .replaceAll(
      "/twc-mirror/_next/static/media/TheWeddingCompanyLogoVertical.b80524ce.webp",
      brandAssets.footerLogo
    )
    .replaceAll("The Wedding Company logo", brandAssets.logoAlt)
    .replaceAll("The Wedding Company Logo", brandAssets.logoAlt);
}

export function applyBranding(markup: string) {
  return applyBrandAssets(markup)
    // Route captured CDN image hosts through the local asset proxy so no
    // theweddingcompany.com host appears in any img src (images still load via
    // the proxy's upstream fallback).
    .replaceAll("https://gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replaceAll("https://imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replaceAll("/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replaceAll("/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    // Social handles.
    .replaceAll("theweddingcompanyofficial", "viraayaweddings")
    .replaceAll("https://www.theweddingcompany.com", brandAssets.url)
    .replaceAll("http://www.theweddingcompany.com", brandAssets.url)
    .replaceAll("www.theweddingcompany.com", "viraayaweddings.com")
    .replaceAll("support@theweddingcompany.com", "support@viraayaweddings.com")
    .replaceAll("@TheWeddingCmpny", "@viraayaweddings")
    .replaceAll("The Wedding Company", brandAssets.name)
    .replaceAll("the wedding company", "Viraaya Weddings")
    .replaceAll("TheWeddingCompany", brandAssets.name)
    .replaceAll("TWC's choice", "Viraaya's choice")
    .replaceAll("TWC&rsquo;s choice", "Viraaya&rsquo;s choice")
    .replaceAll("TWC’s choice", "Viraaya’s choice")
    .replaceAll("TWC Partner", "Viraaya Partner")
    .replaceAll("TWC Client Terms", "Viraaya Client Terms")
    .replaceAll("TWC Vendor Terms", "Viraaya Vendor Terms")
    // Any standalone "TWC" (legal copy, FAQs) -> brand name.
    .replace(/\bTWC\b/g, brandAssets.name)
    // Legal page links: drop the twc- prefix from the public URL.
    .replaceAll("/twc-client-terms", "/client-terms")
    .replaceAll("/twc-vendor-terms", "/vendor-terms")
    .replaceAll("/twc-privacy-policy", "/privacy-policy")
    .replaceAll("/twc-refund-policy", "/refund-policy")
    // Any residual theweddingcompany.com host/text -> brand domain.
    .replaceAll("theweddingcompany.com", "viraayaweddings.com");
}

function getHomepageParts() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "data", "captured-home.html"),
    "utf8"
  );
  const mainStart = html.indexOf("<main");
  const mainEnd = elementEnd(html, mainStart, "main");

  if (mainStart === -1 || mainEnd === -1) {
    throw new Error("Could not find the captured homepage <main> markup.");
  }

  const main = html.slice(mainStart, mainEnd);
  const innerStart = main.indexOf(">") + 1;
  const homeContentStart = main.indexOf('<div id="home-page-revamp"', innerStart);
  const footerMarker = main.indexOf('id="footer_section"', homeContentStart);
  const footerStart = findElementStartBefore(main, footerMarker, "footer");
  const footerEnd = elementEnd(main, footerStart, "footer");
  const mainInnerEnd = main.lastIndexOf("</main>");

  if (
    homeContentStart === -1 ||
    footerMarker === -1 ||
    footerStart === -1 ||
    footerEnd === -1 ||
    mainInnerEnd === -1
  ) {
    throw new Error("Could not split the captured homepage shell.");
  }

  return {
    header: applyBranding(main.slice(innerStart, homeContentStart)),
    content: transformHomepageContent(
      main.slice(homeContentStart, footerStart) + main.slice(footerEnd, mainInnerEnd)
    ),
    footer: applyBranding(main.slice(footerStart, footerEnd))
  };
}

export function getHomepageHeader() {
  return getHomepageParts().header;
}

export function getHomepageFooter() {
  return getHomepageParts().footer;
}

export function getHomepageContent() {
  return getHomepageParts().content;
}

export function stripCapturedHeaderFooter(markup: string) {
  let next = applyBranding(markup);

  next = removeFirstElement(next, '<nav class="sticky top-0 z-30', "nav");
  next = removeFirstElement(next, '<div class="z-[100]', "div");
  next = removeFirstElement(next, '<div class="parent-div is--nav_new"', "div");
  next = replaceFirstElement(next, '<footer', "footer", "");

  return next;
}

export function applyHomepageHeaderFooter(markup: string) {
  let next = applyBranding(markup);
  const header = `<div id="twc-homepage-shared-header">${getHomepageHeader()}</div>`;
  const footer = `<div id="twc-homepage-shared-footer">${getHomepageFooter()}</div>`;

  next = replaceFirstElement(next, '<nav class="sticky top-0 z-30', "nav", header);
  next = replaceFirstElement(next, '<div class="z-[100]', "div", header);
  next = replaceFirstElement(
    next,
    '<div class="parent-div is--nav_new"',
    "div",
    header
  );
  next = replaceFirstElement(next, '<footer', "footer", footer);

  if (!next.includes(header)) {
    const parentIndex = next.indexOf('id="parent-container"');
    const parentStart = findElementStartBefore(next, parentIndex, "div");
    const parentOpenEnd = parentStart === -1 ? -1 : next.indexOf(">", parentStart) + 1;
    const nextStart = next.indexOf('<div id="__next">');
    const insertAt =
      parentOpenEnd > 0
        ? parentOpenEnd
        : nextStart === -1
          ? next.indexOf("<body") === -1
            ? -1
            : next.indexOf(">", next.indexOf("<body")) + 1
          : next.indexOf(">", nextStart) + 1;

    if (insertAt > 0) {
      next = next.slice(0, insertAt) + header + next.slice(insertAt);
    }
  }

  if (!next.includes(footer)) {
    const insertAt = next.indexOf('<div class="Toastify"');
    next =
      insertAt === -1
        ? next.replace("</body>", `${footer}</body>`)
        : next.slice(0, insertAt) + footer + next.slice(insertAt);
  }

  return applyBranding(next);
}
