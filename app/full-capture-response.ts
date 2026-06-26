import fs from "node:fs";
import path from "node:path";
import {
  applyBranding,
  applyHomepageHeaderFooter,
  getHomepageFooter,
  getHomepageHeader
} from "./homepage-shell";

const imageOrigin = "https://imageswedding.theweddingcompany.com";
const homepageStylesheets = [
  "/twc-next/static/css/5baa3d17e8de8438.css",
  "/twc-next/static/css/c8c1bcda263ddb1a.css",
  "/twc-next/static/css/ef46db3751d8e999.css",
  "/twc-next/static/css/ec70c9af02a4e84a.css",
  "/twc-next/static/css/61dbd837b13489b4.css"
];

const sharedShellCss = `
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

  const headMarkup = `${stylesheetMarkup}${sharedShellCss}`;
  return html.replace("</head>", `${headMarkup}</head>`);
}

const imageProxyScript = `
<script>
(() => {
  const remote = "https://imageswedding." + "theweddingcompany" + ".com/";
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
  patchTree(document);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") patchElement(mutation.target);
      for (const node of mutation.addedNodes) patchTree(node);
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["src", "srcset"],
    childList: true,
    subtree: true
  });
})();
</script>`;

function homepageShellScript() {
  const header = `<div id="twc-homepage-shared-header">${getHomepageHeader()}</div>`;
  const footer = `<div id="twc-homepage-shared-footer">${getHomepageFooter()}</div>`;

  return `
<script>
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

    document.querySelectorAll("nav.sticky.top-0, .parent-div.is--nav_new, .venues-header").forEach(removeAlternateHeader);
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

    document.querySelectorAll("footer, .parent-div.is--footer, .venues-footer").forEach(removeAlternateFooter);
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

export function fullCaptureResponse(slug: string) {
  const file = path.join(
    process.cwd(),
    "data",
    "captured-company",
    `${slug}.html`
  );
  const html = applyBranding(applyHomepageHeaderFooter(
    injectHomepageAssets(rewriteAssetUrls(fs.readFileSync(file, "utf8")))
  )).replace("</body>", `${imageProxyScript}${homepageShellScript()}</body>`);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}
