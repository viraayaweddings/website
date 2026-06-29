import fs from "node:fs";
import path from "node:path";

const brandAssets = {
  headerLogo: "/brand/viraaya-logo-header.png",
  footerLogo: "/brand/viraaya-logo-full.png",
  favicon: "/brand/favicon.png",
  logoAlt: "Viraaya Weddings logo",
  name: "Viraaya Weddings",
  url: "https://viraayaweddings.com"
};

const publicContactDetails = {
  addressLabel: "Delhi - Business address/operating address",
  addressHtml:
    "Chattarpur Mandir Rd, Ansal Villas,<br/>Satbari, New Delhi,<br/>Delhi &ndash; 110074",
  phoneDisplay: "+91 81302 22141",
  phoneHref: "tel:+918130222141",
  phoneDigits: "918130222141",
  linkedInUrl: "https://www.linkedin.com/company/viraaya-weddings/"
};

type HomepageParts = {
  header: string;
  content: string;
  footer: string;
};

let homepagePartsCache: HomepageParts | null = null;

export const homepageShellCss = `
<style id="twc-shared-shell-css">
  :root {
    --viraaya-page-rail: clamp(18px, 7vw, 56px);
  }
  #twc-homepage-shared-header {
    position: sticky;
    top: 0;
    z-index: 10000;
  }
  body.twc-modal-open #twc-homepage-shared-header {
    display: none !important;
  }
  #portal #modal-wrapper:has(#modal-content #modal-header),
  #drawer-portal:has(input[placeholder="Search your event city"]),
  #drawer-portal:has(input[placeholder="Enter city of the event"]) {
    display: none !important;
  }
  #twc-homepage-shared-header > * {
    align-items: center !important;
    min-height: 76px !important;
  }
  #twc-homepage-shared-header > .sticky {
    position: static !important;
  }
  #twc-homepage-shared-footer #footer_section {
    box-sizing: border-box;
    width: 100%;
    max-width: 1536px;
    margin-left: auto !important;
    margin-right: auto !important;
    background: #fff;
    color: #000;
  }
  section[class*="max-w-screen-2xl"][class*="md:px-12"]:has([data-virtuoso-scroller]) {
    margin-left: var(--viraaya-page-rail) !important;
    margin-right: var(--viraaya-page-rail) !important;
    max-width: none !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    width: auto !important;
  }
  #twc-homepage-shared-header img[src="/brand/viraaya-logo-header.png"] {
    display: block;
    height: auto !important;
    max-width: min(92px, 18vw);
    object-fit: contain;
    width: 92px !important;
  }
  img[src*="TheWeddingCompanyLogo_Low_Res"],
  img[src*="TheWeddingCompanyLogo.b048b49d"] {
    content: url("/brand/viraaya-logo-header.png") !important;
    height: auto !important;
    max-width: min(92px, 18vw) !important;
    object-fit: contain !important;
    width: 92px !important;
  }
  img[src*="TheWeddingCompanyLogoVertical"] {
    content: url("/brand/viraaya-logo-full.png") !important;
    height: auto !important;
    object-fit: contain !important;
    width: min(300px, 78vw) !important;
  }
  #twc-homepage-shared-footer img[src="/brand/viraaya-logo-full.png"] {
    height: auto !important;
    max-height: none !important;
    object-fit: contain;
    width: min(300px, 78vw) !important;
  }
  #twc-homepage-shared-footer img.hidden[src="/brand/viraaya-logo-full.png"] {
    display: none !important;
  }
  #twc-homepage-shared-footer img[class*="lg:hidden"][src="/brand/viraaya-logo-full.png"] {
    display: block !important;
  }
  #twc-homepage-shared-footer #footer_section > section.grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 1rem !important;
  }
  #twc-homepage-shared-footer #footer_section > section.grid > div {
    display: flex !important;
    flex-direction: column !important;
    gap: 1rem !important;
    grid-column: 1 / -1 !important;
  }
  @media (min-width: 768px) {
    #twc-homepage-shared-footer #footer_section > section.grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    #twc-homepage-shared-footer #footer_section > section.grid > div {
      grid-column: auto !important;
    }
  }
  @media (min-width: 1024px) {
    #twc-homepage-shared-footer #footer_section > section.grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
    #twc-homepage-shared-footer img[class*="lg:block"][src="/brand/viraaya-logo-full.png"] {
      display: block !important;
    }
    #twc-homepage-shared-footer img[class*="lg:hidden"][src="/brand/viraaya-logo-full.png"] {
      display: none !important;
    }
  }
  @media (max-width: 760px) {
    :root {
      --viraaya-page-rail: 18px;
    }
    #twc-homepage-shared-header > * {
      min-height: 62px !important;
    }
    #twc-homepage-shared-header img[src="/brand/viraaya-logo-header.png"] {
      height: auto !important;
      max-width: min(74px, 30vw);
      width: 74px !important;
    }
  }
  #twc-homepage-shared-header .twc-more-menu {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 10001;
    display: grid;
    gap: 4px;
    min-width: 230px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.14);
    opacity: 0;
    padding: 10px;
    pointer-events: none;
    transform: translate3d(0, 8px, 0);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }
  #twc-homepage-shared-header .twc-more-menu a {
    border-radius: 8px;
    display: grid;
    padding: 10px 12px;
    color: #1a1a1a;
    font-size: 14px;
    line-height: 1.35;
    white-space: nowrap;
    text-decoration: none;
  }
  #twc-homepage-shared-header .twc-more-menu a:hover {
    background: #EFE8DF;
    color: #a6804f;
  }
  #twc-homepage-shared-header .twc-more-open .twc-more-menu {
    opacity: 1;
    pointer-events: auto;
    transform: translate3d(0, 0, 0);
  }
  body nav.sticky,
  body .shadow-header,
  body .venues-header,
  body .twc-company-header,
  body .twc-legacy-header,
  body .parent-div.is--nav_new,
  body .navbar-mobile,
  body .mobile-sub-menu-wrapper {
    display: none !important;
  }
  #__next [class*="z-[100]"]:has(#link_wedding_venues_container),
  #__next [class*="translate-y-0"]:has(#link_wedding_venues_container),
  #parent-container > main [class*="z-[100]"]:has(#link_wedding_venues_container),
  #parent-container > main [class*="translate-y-0"]:has(#link_wedding_venues_container) {
    display: none !important;
  }
  #twc-homepage-shared-header nav,
  #twc-homepage-shared-header .shadow-header,
  #twc-homepage-shared-header .venues-header,
  #twc-homepage-shared-header .twc-company-header,
  #twc-homepage-shared-header .twc-legacy-header,
  #twc-homepage-shared-header .parent-div.is--nav_new,
  #twc-homepage-shared-header .navbar-mobile,
  #twc-homepage-shared-header .mobile-sub-menu-wrapper {
    display: revert !important;
  }
  body footer,
  body #footer_section,
  body .parent-div.is--footer,
  body .twc-company-footer,
  body .twc-legacy-footer,
  body .venues-footer {
    display: none !important;
  }
  #twc-homepage-shared-footer footer,
  #twc-homepage-shared-footer #footer_section {
    display: block !important;
  }
  body > nav.sticky.top-0,
  body > .parent-div.is--nav_new,
  body > .navbar-mobile,
  body > .mobile-sub-menu-wrapper,
  #parent-container > .scrollbar-hide > .shadow-header,
  #__next > nav.sticky.top-0,
  #__next > .parent-div.is--nav_new {
    display: none !important;
  }
</style>`;

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

const homepageAboutViraayaWeddingsIntroMarkup = `
  <p>At Viraaya Weddings, we believe every celebration deserves to be extraordinary. Whether you&apos;re planning an intimate ceremony or a grand destination wedding, our team transforms your ideas into beautifully curated experiences that reflect your personality, traditions, and style.</p>
  <p>With a trusted network of premium venues and experienced wedding professionals across India, we simplify the planning process from start to finish. From your first consultation to the final farewell, our experts ensure every detail is thoughtfully managed, allowing you and your family to focus on creating unforgettable memories.</p>
`;

const homepageAboutViraayaWeddingsExpandedMarkup = `
  <h3>Our Wedding Planning Services</h3>
  <p>Planning a wedding involves countless decisions, and we&apos;re here to make each one easier. Our personalized approach helps you select the right services, vendors, and experiences while staying aligned with your budget and vision.</p>

  <h3>Wedding Venue Selection</h3>
  <p>Finding the perfect venue is the foundation of a memorable wedding. Viraaya Weddings offers access to an extensive collection of banquet halls, luxury hotels, resorts, farmhouses, palaces, and destination wedding venues across India.</p>
  <p>Our consultants help you shortlist venues based on your preferred city, guest count, budget, style, and event requirements, making the booking process simple and hassle-free.</p>

  <h3>Wedding D&eacute;cor &amp; Styling</h3>
  <p>Every wedding tells a unique story through its d&eacute;cor. Whether your style is timeless, royal, floral, minimalist, or contemporary, our creative d&eacute;cor partners design breathtaking spaces that perfectly complement your celebration.</p>
  <p>From elegant mandaps and stage d&eacute;cor to themed functions and bespoke floral installations, we ensure every event leaves a lasting impression.</p>

  <h3>Photography &amp; Cinematography</h3>
  <p>Your wedding deserves to be remembered forever. We connect you with talented photographers and filmmakers who specialize in capturing authentic emotions, candid moments, and cinematic wedding stories.</p>
  <p>Whether you prefer traditional photography, modern storytelling, drone coverage, or luxury wedding films, we&apos;ll help you find professionals that match your style and budget.</p>

  <h3>Bridal Beauty &amp; Wedding Essentials</h3>
  <p>From bridal makeup artists and mehendi specialists to entertainment, hospitality, catering, and wedding logistics, Viraaya Weddings helps you book trusted professionals for every aspect of your celebration.</p>
  <p>Our goal is to ensure every service works seamlessly together for a flawless wedding experience.</p>

  <h3>Wedding Inspiration</h3>
  <p>Looking for fresh ideas for your big day?</p>
  <p>Explore our carefully curated collection of wedding inspiration featuring d&eacute;cor concepts, bridal fashion, groom styling, jewellery trends, invitation designs, pre-wedding shoots, mehendi ideas, and much more.</p>
  <p>Save your favourite inspirations and use them to build the wedding you&apos;ve always imagined.</p>

  <h3>Why Choose Viraaya Weddings?</h3>
  <h4>Personalized Wedding Planning</h4>
  <p>Every couple has a unique story, and every wedding should reflect it. Our dedicated wedding specialists take the time to understand your expectations, preferences, traditions, and budget before recommending the most suitable options.</p>

  <h4>Trusted Vendor Network</h4>
  <p>We collaborate with carefully selected venues and wedding professionals known for their quality, reliability, and exceptional service. This allows us to deliver premium experiences while helping you make informed decisions.</p>

  <h4>Transparent Pricing</h4>
  <p>We believe wedding planning should be exciting&mdash;not confusing. Our team provides clear recommendations and works within your budget to maximize value without compromising quality.</p>

  <h4>End-to-End Coordination</h4>
  <p>From venue selection and vendor management to guest coordination and on-ground execution, we oversee every stage of your wedding journey so you can celebrate stress-free with your loved ones.</p>

  <h3>Creating Weddings You&apos;ll Always Remember</h3>
  <p>At Viraaya Weddings, we don&apos;t simply organize weddings&mdash;we craft meaningful celebrations filled with beautiful moments, thoughtful details, and unforgettable experiences. No matter where your dream wedding takes place, we&apos;re committed to making it elegant, seamless, and truly one of a kind.</p>
`;

export const aboutViraayaWeddingsArticleMarkup = `
  <h2>About Viraaya Weddings</h2>
  <h3>Luxury Wedding Planning Services Across India</h3>
  ${homepageAboutViraayaWeddingsIntroMarkup}
  ${homepageAboutViraayaWeddingsExpandedMarkup}
`;

const homepageAboutViraayaWeddingsSection = `
  <section class="bg-[#fffaf0] px-5 py-14 text-primaryTextColor md:px-10 md:py-20" id="more_about_betterhalf_section">
    <style>
      #more_about_betterhalf_section .twc-about-viraaya-content h3 {
        color: #1a1a1a;
        font-family: var(--font-playfair-display, serif);
        font-size: clamp(1.35rem, 2vw, 2rem);
        font-weight: 700;
        line-height: 1.25;
        margin-top: 2.25rem;
      }
      #more_about_betterhalf_section .twc-about-viraaya-content h4 {
        color: #A9804E;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.35;
        margin-top: 1.25rem;
      }
      #more_about_betterhalf_section .twc-about-viraaya-content p {
        margin-top: 0.75rem;
      }
      #more_about_betterhalf_section .twc-about-viraaya-expanded[hidden] {
        display: none;
      }
      #more_about_betterhalf_section .twc-about-viraaya-expanded {
        padding-top: 0.5rem;
      }
      #more_about_betterhalf_section .twc-about-viraaya-toggle {
        align-self: flex-start;
        background: transparent;
        border: 0;
        border-bottom: 1.5px solid #A9804E;
        color: #A9804E;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        line-height: 1.3;
        margin-top: 0.5rem;
        padding: 0.25rem 0 0.1rem;
      }
      #more_about_betterhalf_section .twc-about-viraaya-toggle:hover,
      #more_about_betterhalf_section .twc-about-viraaya-toggle:focus-visible {
        color: #8A693F;
        border-bottom-color: #8A693F;
      }
    </style>
    <div class="mx-auto max-w-screen-lg space-y-8 font-plus-jakarata-sans text-sm leading-relaxed text-secondary md:text-base">
      <div class="space-y-3 text-center">
        <p class="font-playfair text-3xl font-semibold text-primaryTextColor md:text-[44px]">About Viraaya Weddings</p>
        <p class="font-playfair text-2xl font-semibold text-[#A9804E] md:text-4xl">Luxury Wedding Planning Services Across India</p>
      </div>
      <div class="twc-about-viraaya-content flex flex-col space-y-5">
        ${homepageAboutViraayaWeddingsIntroMarkup}
        <div class="twc-about-viraaya-expanded" id="twc-about-viraaya-expanded" hidden>
          ${homepageAboutViraayaWeddingsExpandedMarkup}
        </div>
        <button class="twc-about-viraaya-toggle" type="button" aria-expanded="false" aria-controls="twc-about-viraaya-expanded">Read more</button>
      </div>
    </div>
  </section>
`;

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

function removeAllElements(html: string, needle: string, tag: string) {
  let next = html;
  let previous = "";

  while (next !== previous) {
    previous = next;
    next = removeFirstElement(next, needle, tag);
  }

  return next;
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

function removeElementById(html: string, id: string, tag = "a") {
  const marker = `id="${id}"`;
  const markerIndex = html.indexOf(marker);
  const singleQuoteMarker = `id='${id}'`;
  const index =
    markerIndex === -1 ? html.indexOf(singleQuoteMarker) : markerIndex;

  if (index === -1) {
    return html;
  }

  const start = findElementStartBefore(html, index, tag);
  const end = start === -1 ? -1 : elementEnd(html, start, tag);

  return start === -1 || end === -1
    ? html
    : html.slice(0, start) + html.slice(end);
}

function normalizeAboutContent(markup: string) {
  return replaceFirstElement(
    markup,
    '<section class="mb-8 " id="more_about_betterhalf_section"',
    "section",
    homepageAboutViraayaWeddingsSection
  );
}

const capturedHeaderChromeMarkers = [
  { needle: '<nav class="sticky top-0 z-30', tag: "nav" },
  { needle: '<nav class="sticky top-[-1px]', tag: "nav" },
  { needle: '<nav class="sticky top-', tag: "nav" },
  { needle: '<div class="z-[100]', tag: "div" },
  { needle: '<div class="flex h-14 translate-y-0', tag: "div" },
  { needle: '<div class="flex translate-y-0', tag: "div" },
  { needle: '<div class="parent-div is--nav_new"', tag: "div" },
  { needle: '<div class="navbar-mobile', tag: "div" },
  { needle: '<div class="mobile-sub-menu-wrapper', tag: "div" },
  { needle: '<div class="twc-company-header', tag: "div" },
  { needle: '<div class="twc-legacy-header', tag: "div" },
  { needle: '<div class="venues-header', tag: "div" }
] as const;

const capturedFooterChromeMarkers = [
  { needle: '<footer', tag: "footer" },
  { needle: '<div class="parent-div is--footer', tag: "div" },
  { needle: '<div class="twc-company-footer', tag: "div" },
  { needle: '<div class="twc-legacy-footer', tag: "div" },
  { needle: '<div class="venues-footer', tag: "div" },
  { needle: '<div id="footer_section"', tag: "div" }
] as const;

function removeCapturedChrome(markup: string) {
  return [...capturedHeaderChromeMarkers, ...capturedFooterChromeMarkers].reduce(
    (html, marker) => removeAllElements(html, marker.needle, marker.tag),
    markup
  );
}

function transformHomepageContent(markup: string) {
  return applyBranding(markup)
    .replace(
      /<video class="h-full w-full object-cover" playsinline="" autoplay="" muted="" poster="([^"]+)">[\s\S]*?<\/video>/g,
      '<video class="h-full w-full object-cover" playsinline muted preload="metadata" poster="$1"></video>'
    )
    .replaceAll('fetchpriority="high"', 'loading="lazy"')
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
      "/twc-next/static/media/TheWeddingCompanyLogo.b048b49d.webp",
      brandAssets.headerLogo
    )
    .replaceAll(
      "/_next/static/media/TheWeddingCompanyLogo.b048b49d.webp",
      brandAssets.headerLogo
    )
    .replaceAll(
      "/twc-mirror/_next/static/media/TheWeddingCompanyLogo.b048b49d.webp",
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

function normalizeFavicons(markup: string) {
  const withoutCapturedIcons = markup.replace(
    /<link\b(?=[^>]*\brel=["'][^"']*(?:shortcut\s+icon|apple-touch-icon|\bicon\b)[^"']*["'])[^>]*>/gi,
    ""
  );

  if (!/<\/head>/i.test(withoutCapturedIcons)) {
    return withoutCapturedIcons;
  }

  const faviconMarkup = `<link rel="icon" href="${brandAssets.favicon}" type="image/png" /><link rel="apple-touch-icon" href="${brandAssets.favicon}" />`;
  return withoutCapturedIcons.replace(/<\/head>/i, `${faviconMarkup}</head>`);
}

export function sanitizePublicDetails(markup: string) {
  return markup
    .replaceAll("https://api.betterhalf.ai/v2", "/twc-api/disabled/v2")
    .replaceAll("https:\\/\\/api.betterhalf.ai\\/v2", "/twc-api/disabled/v2")
    .replaceAll("https://gcpstaging1.betterhalf.ai", "/twc-api/disabled/staging")
    .replaceAll("https:\\/\\/gcpstaging1.betterhalf.ai", "/twc-api/disabled/staging")
    .replaceAll("https://weddingconsumerapi.betterhalf.ai", "/twc-api/disabled/consumer")
    .replaceAll("https:\\/\\/weddingconsumerapi.betterhalf.ai", "/twc-api/disabled/consumer")
    .replaceAll("NEXT_PUBLIC_MOCK_BASE_API_URL", "DISABLED_PUBLIC_CAPTURE_API_URL");
}

function normalizeBrandColors(markup: string) {
  return markup
    .replaceAll("#A1285E", "#A9804E")
    .replaceAll("#a1285e", "#a9804e")
    .replaceAll("#9A2157", "#A6804F")
    .replaceAll("#9a2157", "#a6804f")
    .replaceAll("#BC2D6D", "#A9804E")
    .replaceAll("#bc2d6d", "#a9804e")
    .replaceAll("#FF5B91", "#A9804E")
    .replaceAll("#ff5b91", "#a9804e")
    .replaceAll("#FC558C", "#A9804E")
    .replaceAll("#fc558c", "#a9804e")
    .replaceAll("#E5097F", "#A9804E")
    .replaceAll("#e5097f", "#a9804e")
    .replaceAll("#fff1f6", "#EFE8DF")
    .replaceAll("#FFF1F6", "#EFE8DF")
    .replaceAll("rgb(161 40 94", "rgb(169 128 78")
    .replaceAll("rgb(255 91 149", "rgb(169 128 78")
    .replaceAll("rgb(255 91 145", "rgb(169 128 78")
    .replaceAll("rgba(161,40,94", "rgba(169,128,78")
    .replaceAll("rgba(255,91,149", "rgba(169,128,78")
    .replaceAll("rgba(255,91,145", "rgba(169,128,78");
}

function normalizeContactDetails(markup: string) {
  const removedSocialLinks = [
    "footer_facebook_icon_link",
    "footer_youtube_icon_link",
    "footer_x_icon_link",
    "footer_twitter_icon_link",
    "footer_pinterest_icon_link"
  ].reduce((html, id) => removeElementById(html, id), markup);

  return removedSocialLinks
    .replaceAll(
      "https://www.linkedin.com/company/the-wedding-company-twc/",
      publicContactDetails.linkedInUrl
    )
    .replaceAll(
      "https://www.linkedin.com/company/the-wedding-company-twc",
      publicContactDetails.linkedInUrl
    )
    .replaceAll(
      "href=\"tel:8884090499\"",
      `href="${publicContactDetails.phoneHref}"`
    )
    .replaceAll(
      "href='tel:8884090499'",
      `href='${publicContactDetails.phoneHref}'`
    )
    .replaceAll("+918884090499", publicContactDetails.phoneDisplay)
    .replaceAll("+91 88840 90499", publicContactDetails.phoneDisplay)
    .replaceAll("8884090499", publicContactDetails.phoneDigits)
    .replaceAll("919916434754", publicContactDetails.phoneDigits)
    .replaceAll(
      "Bangalore - Business address/operating address",
      publicContactDetails.addressLabel
    )
    .replaceAll(
      "Ground Floor, 375, <br/>5th Main Rd, <br/>HSR Layout Sector 6,<br/>Bengaluru, Karnataka 560102",
      publicContactDetails.addressHtml
    );
}

export function applyBranding(markup: string) {
  const branded = sanitizePublicDetails(applyBrandAssets(markup))
    // Route captured CDN image hosts through local vendored asset handlers.
    .replaceAll("https://gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replaceAll("https://imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replaceAll("https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replaceAll("https://storage.googleapis.com", "/venue-assets/storage")
    .replaceAll("https://maps.gstatic.com", "/venue-assets/maps")
    .replaceAll("https://cdn.prod.website-files.com", "/venue-assets/webflowcdn")
    .replaceAll("https://assets-global.website-files.com", "/venue-assets/webflowassets")
    .replaceAll("/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages")
    .replaceAll("/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding")
    .replaceAll("/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage")
    .replaceAll("/twc-venues-local/storage.googleapis.com", "/venue-assets/storage")
    .replaceAll("/twc-venues-local/maps.gstatic.com", "/venue-assets/maps")
    .replaceAll("/twc-venues-local/cdn.prod.website-files.com", "/venue-assets/webflowcdn")
    .replaceAll("/twc-venues-local/assets-global.website-files.com", "/venue-assets/webflowassets")
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
    .replaceAll("/price-beat-challenge", "/wedding-services")
    .replaceAll("/wedding-payment-plan", "/wedding-services")
    .replaceAll("Price Beat Challenge", "Wedding Services")
    .replaceAll("Service Payment Plan", "Service Details")
    // Any standalone "TWC" (legal copy, FAQs) -> brand name.
    .replace(/\bTWC\b/g, brandAssets.name)
    // Legal page links: drop the twc- prefix from the public URL.
    .replaceAll("/twc-client-terms", "/client-terms")
    .replaceAll("/twc-vendor-terms", "/vendor-terms")
    .replaceAll("/twc-privacy-policy", "/privacy-policy")
    .replaceAll("/twc-refund-policy", "/refund-policy")
    // Any residual theweddingcompany.com host/text -> brand domain.
    .replaceAll("theweddingcompany.com", "viraayaweddings.com");

  return normalizeFavicons(normalizeBrandColors(
    normalizeContactDetails(normalizeAboutContent(branded))
  ));
}

function getHomepageParts() {
  if (homepagePartsCache) {
    return homepagePartsCache;
  }

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

  homepagePartsCache = {
    header: applyBranding(main.slice(innerStart, homeContentStart)),
    content: transformHomepageContent(
      main.slice(homeContentStart, footerStart) + main.slice(footerEnd, mainInnerEnd)
    ),
    footer: applyBranding(main.slice(footerStart, footerEnd))
  };

  return homepagePartsCache;
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
  return removeCapturedChrome(applyBranding(markup));
}

export function applyHomepageHeaderFooter(markup: string) {
  let next = removeCapturedChrome(applyBranding(markup));
  const header = `<div id="twc-homepage-shared-header">${getHomepageHeader()}</div>`;
  const footer = `<div id="twc-homepage-shared-footer">${getHomepageFooter()}</div>`;

  if (!next.includes(header)) {
    const bodyIndex = next.indexOf("<body");
    const bodyOpenEnd = bodyIndex === -1 ? -1 : next.indexOf(">", bodyIndex) + 1;
    const parentIndex = next.indexOf('id="parent-container"');
    const parentStart = findElementStartBefore(next, parentIndex, "div");
    const parentOpenEnd = parentStart === -1 ? -1 : next.indexOf(">", parentStart) + 1;
    const nextStart = next.indexOf('<div id="__next">');
    const insertAt =
      bodyOpenEnd > 0
        ? bodyOpenEnd
        : parentOpenEnd > 0
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
    const bodyEnd = next.lastIndexOf("</body>");
    next =
      bodyEnd !== -1
        ? next.slice(0, bodyEnd) + footer + next.slice(bodyEnd)
        : insertAt === -1
        ? `${next}${footer}`
        : next.slice(0, insertAt) + footer + next.slice(insertAt);
  }

  return applyBranding(next);
}

export function homepageShellScript() {
  const header = `<div id="twc-homepage-shared-header">${getHomepageHeader()}</div>`;
  const footer = `<div id="twc-homepage-shared-footer">${getHomepageFooter()}</div>`;

  return `
<script id="twc-homepage-shell-enforcer">
(() => {
  const headerHtml = ${JSON.stringify(header)};
  const footerHtml = ${JSON.stringify(footer)};
  const faviconHref = ${JSON.stringify(brandAssets.favicon)};

  const setupMoreDropdown = () => {
    const trigger = document.querySelector("#twc-homepage-shared-header #other_services_dropdown_container");
    if (!trigger || trigger.dataset.twcDropdownReady === "1") return;

    let menu = trigger.querySelector(".twc-more-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "twc-more-menu";
      menu.setAttribute("role", "menu");
      menu.innerHTML = \`
        <a href="/wedding-ideas" role="menuitem">Wedding Ideas</a>
        <a href="/wedding-photographers" role="menuitem">Wedding Photographers</a>
        <a href="/wedding-decorators" role="menuitem">Wedding Decorators</a>
        <a href="/wedding-services" role="menuitem">Wedding Services</a>
        <a href="/wedding-invitation-card" role="menuitem">Wedding Invitation Card</a>
      \`;
      trigger.appendChild(menu);
    }

    let closeTimer;
    const clearCloseTimer = () => {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    };
    const open = () => {
      clearCloseTimer();
      trigger.classList.add("twc-more-open");
    };
    const close = () => {
      clearCloseTimer();
      trigger.classList.remove("twc-more-open");
    };
    const scheduleClose = () => {
      clearCloseTimer();
      closeTimer = window.setTimeout(close, 180);
    };
    const toggle = (event) => {
      if (event.target && event.target.closest && event.target.closest(".twc-more-menu")) return;
      event.preventDefault();
      clearCloseTimer();
      trigger.classList.toggle("twc-more-open");
    };
    const closeFromOutside = (event) => {
      if (event.target && trigger.contains(event.target)) return;
      close();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") close();
    };

    trigger.addEventListener("pointerenter", open);
    trigger.addEventListener("pointerleave", scheduleClose);
    trigger.addEventListener("click", toggle);
    document.addEventListener("click", closeFromOutside);
    document.addEventListener("keydown", closeOnEscape);
    trigger.dataset.twcDropdownReady = "1";
  };

  const syncOverlayState = () => {
    if (!document.body) return;
    let hasGalleryOverlay = false;
    document.querySelectorAll('[role="dialog"], .fixed, [class*="fixed"]').forEach((element) => {
      if (hasGalleryOverlay || element.closest("#twc-homepage-shared-header")) return;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;
      const rect = element.getBoundingClientRect();
      const className = typeof element.className === "string" ? element.className : "";
      const looksFullscreen = rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.5;
      const looksLikeGallery = /gallery|modal|dialog|swiper|photo/i.test(className + " " + (element.id || ""));
      if (looksFullscreen && (looksLikeGallery || element.querySelector("img"))) {
        hasGalleryOverlay = true;
      }
    });
    document.body.classList.toggle("twc-modal-open", hasGalleryOverlay);
  };

  const removeCitySelectionPopup = () => {
    if (!document.body) return;
    const markers = [
      "Get wedding services curated for your city",
      "Use my current location"
    ];
    const unlockBody = () => {
      document.body.classList.remove("twc-modal-open");
      document.body.classList.remove("block-scroll");
      document.body.style.overflow = "";
    };
    document.querySelectorAll("#portal, #modal-wrapper, #modal-content, #drawer-portal").forEach((element) => {
      const text = element.textContent || "";
      if (markers.some((marker) => text.includes(marker))) {
        element.remove();
        unlockBody();
      }
    });
    const popupNodes = Array.from(document.body.querySelectorAll("*")).filter((element) => {
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) return false;
      const text = element.textContent || "";
      return markers.some((marker) => text.includes(marker));
    });
    popupNodes.forEach((element) => {
      let current = element;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const className = typeof current.className === "string" ? current.className : "";
        const id = current.id || "";
        if (
          current.getAttribute("role") === "dialog" ||
          current.getAttribute("aria-modal") === "true" ||
          /modal|dialog|portal/i.test(className + " " + id) ||
          (style.position === "fixed" && Number(style.zIndex || 0) >= 20)
        ) {
          current.remove();
          unlockBody();
          return;
        }
        current = current.parentElement;
      }
      if (element.parentElement && element.parentElement !== document.body) {
        element.parentElement.remove();
      } else {
        element.remove();
      }
      unlockBody();
    });
  };

  const removeUnsupportedCities = () => {
    const allowed = new Set(["delhi", "gurugram", "noida", "jaipur", "udaipur"]);
    const blockedNames = new Set(["bengaluru", "bangalore", "mumbai", "goa", "jodhpur", "jaisalmer"]);
    const cityNameOf = (value) => (value || "").trim().toLowerCase();
    document.querySelectorAll("#venues_in_different_cities_section a, #venues_in_different_cities_section button, #venues_in_different_cities_section p").forEach((node) => {
      const text = cityNameOf(node.textContent);
      const href = cityNameOf(node.getAttribute && node.getAttribute("href"));
      const citySlug = [...blockedNames].find((name) => text === name || href.includes("/" + name));
      if (!citySlug) return;
      (node.closest(".z-50.w-fit") || node.closest("li") || node.closest("article") || node.parentElement || node).remove();
    });
    document.querySelectorAll('a[href*="/wedding-venues/"], a[href*="/wedding-photographers/"], a[href*="/wedding-decorators/"]').forEach((link) => {
      const href = cityNameOf(link.getAttribute("href"));
      const cityMatch = href.match(/\/wedding-(?:venues|photographers|decorators)\/([^/?#]+)/);
      const citySlug = cityMatch ? cityMatch[1] : "";
      if (citySlug && !allowed.has(citySlug)) link.remove();
    });
  };

  const venueMediaAliases = {
    "Calendar.d19ed62a.webp": "/twc-mirror/_next/static/media/Calendar.d19ed62a.webp",
    "Promotion.757e6a61.webp": "/twc-mirror/_next/static/media/Promotion.757e6a61.webp",
    "TestimonialBorder.22703fa1.png": "/twc-mirror/_next/static/media/TestimonialBorder.22703fa1.png",
    "WeddingRing.04acaeb5.webp": "/twc-mirror/_next/static/media/WeddingRing.04acaeb5.webp",
    "GoldenBorder.18b3e3aa.svg": "/twc-mirror/_next/static/media/GoldenBorder.18b3e3aa.svg",
    "successCheck.4ac15663.png": "/twc-mirror/_next/static/media/successCheck.4ac15663.png",
    "pinkCheckIcon.fad964b8.webp": "/twc-mirror/_next/static/media/pinkCheckIcon.fad964b8.webp",
    "point.ac316946.png": "/twc-mirror/_next/static/media/point.ac316946.png",
    "golden-icon-left.8794ea31.webp": "/twc-mirror/_next/static/media/golden-icon-left.8794ea31.webp",
    "golden-icon-right.e81179aa.webp": "/twc-mirror/_next/static/media/golden-icon-right.e81179aa.webp"
  };

  const normalizeMirroredAssetPath = (value) => {
    if (!value || typeof value !== "string") return value;
    let next = value;
    while (next.includes("/twc-mirror/twc-mirror/")) {
      next = next.split("/twc-mirror/twc-mirror/").join("/twc-mirror/");
    }
    if (next.startsWith("/_next/static/media/")) next = "/twc-mirror" + next;
    return next;
  };

  const normalizeMirroredAssetPaths = () => {
    document.querySelectorAll("[src], [srcset], [href], [data-src]").forEach((node) => {
      ["src", "srcset", "href", "data-src"].forEach((attr) => {
        const value = node.getAttribute && node.getAttribute(attr);
        if (!value) return;
        const next = normalizeMirroredAssetPath(value);
        if (next !== value) node.setAttribute(attr, next);
      });
    });
  };

  const repairVenueMediaImages = () => {
    normalizeMirroredAssetPaths();
    document.querySelectorAll("img").forEach((img) => {
      const markup = [
        img.currentSrc,
        img.src,
        img.getAttribute("src"),
        img.getAttribute("srcset"),
        img.getAttribute("data-src"),
        img.getAttribute("alt")
      ].filter(Boolean).join(" ");
      const match = Object.entries(venueMediaAliases).find(([file]) => markup.includes(file));
      if (!match) return;
      const [, localSrc] = match;
      if (img.getAttribute("src") !== localSrc) img.setAttribute("src", localSrc);
      if (img.getAttribute("srcset")) img.removeAttribute("srcset");
      if (img.getAttribute("data-src")) img.setAttribute("data-src", localSrc);
    });
  };

  const removeAlternateHeader = (element) => {
    if (!element || element.closest("#twc-homepage-shared-header")) return;
    element.remove();
  };

  const removeAlternateFooter = (element) => {
    if (!element || element.closest("#twc-homepage-shared-footer")) return;
    element.remove();
  };

  const findHomeLikeHeader = (marker) => {
    let current = marker;
    while (current && current.parentElement) {
      if (typeof current.className === "string" && current.className.includes("z-[100]")) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  };

  const enforceFavicon = () => {
    if (!document.head) return;
    document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      const rel = (link.getAttribute("rel") || "").toLowerCase();
      const href = link.getAttribute("href") || "";
      if ((rel.includes("icon") || rel.includes("apple-touch-icon")) && href !== faviconHref) {
        link.remove();
      }
    });
    if (!document.querySelector('link[rel="icon"][href="' + faviconHref + '"]')) {
      const icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/png";
      icon.href = faviconHref;
      document.head.appendChild(icon);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"][href="' + faviconHref + '"]')) {
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = faviconHref;
      document.head.appendChild(apple);
    }
  };

  const enforceShell = () => {
    if (!document.body) {
      window.setTimeout(enforceShell, 30);
      return;
    }

    enforceFavicon();

    if (!document.querySelector("#twc-homepage-shared-header")) {
      document.body.insertAdjacentHTML("afterbegin", headerHtml);
    }

    document.querySelectorAll([
      "nav.sticky",
      ".parent-div.is--nav_new",
      ".navbar-mobile",
      ".mobile-sub-menu-wrapper",
      ".shadow-header",
      ".venues-header",
      ".twc-company-header",
      ".twc-legacy-header"
    ].join(",")).forEach(removeAlternateHeader);
    document.querySelectorAll([
      "#link_wedding_venues_container",
      "#other_services_dropdown_container",
      "#link_refund_policy_container"
    ].join(",")).forEach((marker) => {
      removeAlternateHeader(findHomeLikeHeader(marker));
    });

    if (!document.querySelector("#twc-homepage-shared-footer")) {
      const before =
        document.querySelector(".Toastify") ||
        document.querySelector("#portal") ||
        null;
      if (before && before.parentElement) {
        before.insertAdjacentHTML("beforebegin", footerHtml);
      } else {
        document.body.insertAdjacentHTML("beforeend", footerHtml);
      }
    }

    document.querySelectorAll([
      "footer",
      "#footer_section",
      ".parent-div.is--footer",
      ".venues-footer",
      ".twc-company-footer",
      ".twc-legacy-footer"
    ].join(",")).forEach(removeAlternateFooter);
    setupMoreDropdown();
    removeCitySelectionPopup();
    removeUnsupportedCities();
    repairVenueMediaImages();
    syncOverlayState();
  };

  let shellScheduled = false;
  const scheduleShell = () => {
    if (shellScheduled) return;
    shellScheduled = true;
    window.requestAnimationFrame(() => {
      shellScheduled = false;
      enforceShell();
    });
  };

  enforceShell();
  [120, 400, 1000, 2500, 5000].forEach((delay) => setTimeout(enforceShell, delay));
  const shellRepairInterval = window.setInterval(enforceShell, 1000);
  window.setTimeout(() => window.clearInterval(shellRepairInterval), 30000);
  const cityPopupInterval = window.setInterval(removeCitySelectionPopup, 250);
  window.setTimeout(() => window.clearInterval(cityPopupInterval), 10000);
  try {
    new MutationObserver(() => {
      scheduleShell();
    }).observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "style", "aria-hidden", "role", "src", "srcset", "data-src", "href", "rel"]
    });
  } catch (e) {}
  document.addEventListener("error", (event) => {
    if (event.target && event.target.tagName === "IMG") repairVenueMediaImages();
  }, true);
  window.addEventListener("pageshow", enforceShell, { once: true });
  window.addEventListener("load", enforceShell, { once: true });
  window.addEventListener("resize", syncOverlayState);
})();
</script>`;
}

// Additive, framework-agnostic accessibility hardening that runs on top of the
// mirrored vendor bundle WITHOUT changing its markup, styles, or behaviour:
//  - gives icon-only controls an accessible name (screen readers / voice control)
//  - marks the current section in the shared nav with aria-current
//  - makes new-tab links safe with rel="noopener noreferrer"
//  - restores a visible keyboard focus ring (focus-visible only, so mouse users
//    are unaffected)
// Everything is wrapped in try/catch, is idempotent, and only ever ADDS
// attributes — it never removes or rewrites existing ones, so it cannot break
// existing functionality.
function accessibilityEnhancerScript() {
  return `
<style id="twc-a11y-focus">
:where(a,button,input,select,textarea,[tabindex]):focus-visible{outline:2px solid #A9804E;outline-offset:2px;}
</style>
<script id="twc-a11y-enhancer">
(() => {
  const labelFor = (el) => {
    try {
      const id = (el.id || "").toLowerCase();
      const cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
      const txt = (el.textContent || "").trim();
      if (el.title && el.title.trim()) return el.title.trim();
      if (id.includes("search") || cls.includes("search")) return "Search";
      if (id.includes("close") || cls.includes("close")) return "Close";
      if (txt === "‹" || cls.includes("left") || cls.includes("prev")) return "Previous";
      if (txt === "›" || cls.includes("right") || cls.includes("next")) return "Next";
      return "";
    } catch (e) { return ""; }
  };
  const hasName = (el) => {
    if ((el.textContent || "").trim()) return true;
    if (el.getAttribute("aria-label")) return true;
    if (el.getAttribute("aria-labelledby")) return true;
    if (el.getAttribute("title")) return true;
    const img = el.querySelector("img[alt]");
    if (img && (img.getAttribute("alt") || "").trim()) return true;
    return false;
  };
  const enhance = () => {
    try {
      document.querySelectorAll('a[target="_blank"]:not([data-twc-a11y])').forEach((a) => {
        const rel = (a.getAttribute("rel") || "").toLowerCase();
        const add = ["noopener", "noreferrer"].filter((r) => !rel.includes(r));
        if (add.length) a.setAttribute("rel", (rel ? rel + " " : "") + add.join(" "));
        a.setAttribute("data-twc-a11y", "1");
      });
      document.querySelectorAll("button:not([data-twc-a11y]), [role=button]:not([data-twc-a11y])").forEach((b) => {
        if (!hasName(b)) {
          const label = labelFor(b);
          if (label) b.setAttribute("aria-label", label);
        }
        b.setAttribute("data-twc-a11y", "1");
      });
      const path = (location.pathname || "").replace(/\\/+$/, "") || "/";
      document.querySelectorAll("#twc-homepage-shared-header a[href]").forEach((link) => {
        try {
          const href = new URL(link.href, location.origin).pathname.replace(/\\/+$/, "") || "/";
          if (href !== "/" && (path === href || path.startsWith(href + "/"))) {
            link.setAttribute("aria-current", "page");
          } else if (link.getAttribute("aria-current") === "page") {
            link.removeAttribute("aria-current");
          }
        } catch (e) {}
      });
    } catch (e) {}
  };
  enhance();
  [200, 600, 1500, 3000].forEach((t) => setTimeout(enhance, t));
  try {
    new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  window.addEventListener("pageshow", enhance, { once: true });
})();
</script>`;
}

export function injectHomepageShellSupport(markup: string) {
  let next = markup.includes('id="twc-shared-shell-css"')
    ? markup
    : markup.replace("</head>", `${homepageShellCss}</head>`);

  if (!next.includes('id="twc-homepage-shell-enforcer"')) {
    const insertAt = next.lastIndexOf("</body>");
    next =
      insertAt === -1
        ? `${next}${homepageShellScript()}`
        : `${next.slice(0, insertAt)}${homepageShellScript()}${next.slice(insertAt)}`;
  }

  if (!next.includes('id="twc-a11y-enhancer"')) {
    const insertAt = next.lastIndexOf("</body>");
    next =
      insertAt === -1
        ? `${next}${accessibilityEnhancerScript()}`
        : `${next.slice(0, insertAt)}${accessibilityEnhancerScript()}${next.slice(insertAt)}`;
  }

  return next;
}
