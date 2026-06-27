import fs from "node:fs";
import path from "node:path";

const brandAssets = {
  headerLogo: "/brand/viraaya-logo-header.png",
  footerLogo: "/brand/viraaya-logo-full.png",
  logoAlt: "Viraaya Weddings logo",
  name: "Viraaya Weddings",
  url: "https://viraayaweddings.com"
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
    background: #fff1f6;
    color: #9a2157;
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

export function applyBranding(markup: string) {
  return sanitizePublicDetails(applyBrandAssets(markup))
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
