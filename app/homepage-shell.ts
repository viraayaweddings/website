import fs from "node:fs";
import path from "node:path";

const brandAssets = {
  headerLogo: "/brand/viraaya-logo-header.png",
  footerLogo: "/brand/viraaya-logo-full.png",
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

export const homepageShellCss = `
<style id="twc-shared-shell-css">
  #twc-homepage-shared-header {
    position: sticky;
    top: 0;
    z-index: 10000;
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
  #twc-homepage-shared-header img[src="/brand/viraaya-logo-header.png"] {
    display: block;
    height: auto !important;
    max-width: min(92px, 18vw);
    object-fit: contain;
    width: 92px !important;
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
    top: calc(100% + 10px);
    z-index: 10001;
    display: none;
    min-width: 230px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.14);
    overflow: hidden;
  }
  #twc-homepage-shared-header .twc-more-menu a {
    display: block;
    padding: 12px 16px;
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
    display: block;
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

export const aboutViraayaWeddingsArticleMarkup = `
  <h2>About Viraaya Weddings</h2>
  <h3>Luxury Wedding Planning Services Across India</h3>
  <p>At Viraaya Weddings, we believe every celebration deserves to be extraordinary. Whether you&apos;re planning an intimate ceremony or a grand destination wedding, our team transforms your ideas into beautifully curated experiences that reflect your personality, traditions, and style.</p>
  <p>With a trusted network of premium venues and experienced wedding professionals across India, we simplify the planning process from start to finish. From your first consultation to the final farewell, our experts ensure every detail is thoughtfully managed, allowing you and your family to focus on creating unforgettable memories.</p>

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
    </style>
    <div class="mx-auto max-w-screen-lg space-y-8 font-plus-jakarata-sans text-sm leading-relaxed text-secondary md:text-base">
      <div class="space-y-3 text-center">
        <p class="font-playfair text-3xl font-semibold text-primaryTextColor md:text-[44px]">About Viraaya Weddings</p>
        <p class="text-lg font-semibold text-[#A9804E] md:text-2xl">Luxury Wedding Planning Services Across India</p>
      </div>
      <div class="twc-about-viraaya-content space-y-5">
        ${aboutViraayaWeddingsArticleMarkup.replace(
          "<h2>About Viraaya Weddings</h2>\n  <h3>Luxury Wedding Planning Services Across India</h3>",
          ""
        )}
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

  return normalizeBrandColors(
    normalizeContactDetails(normalizeAboutContent(branded))
  );
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

export function homepageShellScript() {
  const header = `<div id="twc-homepage-shared-header">${getHomepageHeader()}</div>`;
  const footer = `<div id="twc-homepage-shared-footer">${getHomepageFooter()}</div>`;

  return `
<script id="twc-homepage-shell-enforcer">
(() => {
  const headerHtml = ${JSON.stringify(header)};
  const footerHtml = ${JSON.stringify(footer)};

  const setupMoreDropdown = () => {
    const trigger = document.querySelector("#twc-homepage-shared-header #other_services_dropdown_container");
    if (!trigger || trigger.dataset.twcDropdownReady === "1") return;

    let menu = trigger.querySelector(".twc-more-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "twc-more-menu";
      menu.innerHTML = \`
        <a href="/wedding-ideas">Wedding Ideas</a>
        <a href="/wedding-photography">Wedding Photographers</a>
        <a href="/wedding-decorators">Wedding Decorators</a>
        <a href="/wedding-services">Wedding Services</a>
        <a href="/wedding-invitation-card">Wedding Invitation Card</a>
      \`;
      trigger.appendChild(menu);
    }

    const open = () => trigger.classList.add("twc-more-open");
    const close = () => trigger.classList.remove("twc-more-open");
    const toggle = (event) => {
      event.preventDefault();
      trigger.classList.toggle("twc-more-open");
    };

    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", close);
    trigger.addEventListener("click", toggle);
    trigger.dataset.twcDropdownReady = "1";
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

  const enforceShell = () => {
    const container =
      document.querySelector("#parent-container") ||
      document.querySelector("#__next") ||
      document.body;

    if (!document.querySelector("#twc-homepage-shared-header")) {
      container.insertAdjacentHTML("afterbegin", headerHtml);
    }

    document.querySelectorAll("nav.sticky.top-0, .parent-div.is--nav_new, .venues-header, .twc-company-header, .twc-legacy-header").forEach(removeAlternateHeader);
    document.querySelectorAll("#link_wedding_venues_container").forEach((marker) => {
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
        container.insertAdjacentHTML("beforeend", footerHtml);
      }
    }

    document.querySelectorAll("footer, .parent-div.is--footer, .venues-footer, .twc-company-footer, .twc-legacy-footer").forEach(removeAlternateFooter);
    setupMoreDropdown();
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enforceShell();
    });
  };

  enforceShell();
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>`;
}

export function injectHomepageShellSupport(markup: string) {
  let next = markup.includes('id="twc-shared-shell-css"')
    ? markup
    : markup.replace("</head>", `${homepageShellCss}</head>`);

  if (!next.includes('id="twc-homepage-shell-enforcer"')) {
    next = next.replace("</body>", `${homepageShellScript()}</body>`);
  }

  return next;
}
