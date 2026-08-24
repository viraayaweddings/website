/**
 * Public-site HTML transforms: cookie consent, lazy images, inline analytics removal.
 */
import imageMigrationMap from "../../scripts/image-migration-map.json";
import { loadMediaDimensions } from "./image-dimensions";
import { isHtmlResponse } from "./inject";

const legacyMediaPaths = imageMigrationMap as Record<string, string>;

const IMAGE_EXT = "jpg|jpeg|png|webp|avif|gif|svg";
const ABSOLUTE_LEGACY_IMAGE = new RegExp(
  `(?<=["'\\s(=,])/(?!media/)[A-Za-z0-9_][^"'\\s),]*?\\.(?:${IMAGE_EXT})(?:[?#][^"'\\s),]*)?`,
  "gi",
);
const RELATIVE_LEGACY_IMAGE = new RegExp(
  `(?<=["'\\s(=,])(\\.{1,2}/[^"'\\s),]*?\\.(?:${IMAGE_EXT})(?:[?#][^"'\\s),]*)?)`,
  "gi",
);

/**
 * The two form `action`s left pointing at deprecated endpoints.
 *
 * `lead-forms.js` intercepts the submit and posts to `/api/lead` directly, so
 * this was never the path a working submission took. It is the path a
 * *broken* one takes: if that script fails to load, is blocked, or errors
 * before it binds, the browser falls through to a real navigation, and the
 * deprecated endpoint's POST handler still accepts and stores the lead --
 * but the response is bare JSON rendered as the next page, which reads to a
 * visitor as the site being broken even though their enquiry went through.
 * Pointing `action` at the real endpoint removes the JS dependency entirely.
 */
const DEPRECATED_FORM_ACTION = /\baction="\/(?:contact\/save|blog-form-submit)"/gi;

const GTAG_INLINE =
  /<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config',\s*'G-8KV1YV2GD8'\);\s*<\/script>/gi;

const SKIP_LINK =
  '<a href="#main-content" class="vw-skip-link">Skip to main content</a>';

const CITY_FILTER_SCRIPT = '<script src="/js/city-filter-mobile.js" defer></script>';

/**
 * The two fonts every page needs before first paint: Inter 400 is the `body`
 * default, Readex Pro 600 is what every `<h1>` renders in. Preloading only
 * these -- not all 47 -- keeps the hint on the actual critical path; hinting
 * every weight would just contend with the two that matter and the browser
 * would still discover the rest from the stylesheet at the normal time.
 */
const FONT_PRELOADS =
  '<link rel="preload" as="font" type="font/woff2" href="/vendor/google-fonts/font-12.woff2" crossorigin>' +
  '<link rel="preload" as="font" type="font/woff2" href="/vendor/google-fonts/font-40.woff2" crossorigin>';

const PUBLIC_ENHANCEMENTS_STYLE = `<style id="vw-public-enhancements">
.vw-skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.vw-skip-link:focus{left:1rem;top:1rem;width:auto;height:auto;padding:.5rem 1rem;background:#111;color:#fff;z-index:2000;border-radius:6px}
@media (max-width:991px){
  .sidebar-mobile-popup{display:none;position:fixed;inset:0;z-index:1050;background:rgba(0,0,0,.45);padding:1rem;overflow:auto}
  .sidebar-mobile-popup.is-open{display:block}
  .sidebar-mobile-popup .sidebar{background:#fff;border-radius:12px;padding:1rem;max-width:420px;margin:3rem auto 0}
}
/* The visible carousel dots stay pixel-tiny by design (4-8px); WCAG 2.5.5
   wants a 44px tap target regardless. An invisible ::after expands the hit
   area without touching what the dot looks like. */
.slick-dots li{margin:0 8px}
.slick-dots li button{position:relative}
.slick-dots li button::after{content:"";position:absolute;inset:-18px}
/* Search inputs and similar 20px-tall fields fall well under the same
   44px floor; padding grows the box without changing the visible chrome. */
.hero-search input[type="search"],
#searchbox{min-height:44px;padding-top:.5rem;padding-bottom:.5rem}
@media (max-width:767px){
  /* 12px is this site's own stated legibility floor; fs-8/9/10/11 sat below
     it site-wide. fs-12 and up are left alone. */
  .fs-8,.fs-9,.fs-10,.fs-11{font-size:12px!important}
}
</style>`;

const BLOG_FORM_EMAIL_FIELD =
  '<input type="email" name="email" placeholder="Your email (optional)" class="form-control" autocomplete="email">';

const DEFER_EXEMPT = /mutation-observer-guard|cookie-consent|lead-forms|gtag|googletagmanager/i;

/**
 * `<button>` with no `type` defaults to `type="submit"` per the HTML spec.
 * `#goTop` never carried an explicit one, so inside any form it would submit
 * that form instead of scrolling.
 */
const GO_TOP_BUTTON = /<button\s+id="goTop"(?![^>]*\btype=)/i;

/** The header logo link -- an image with alt="logo" gives it a weak, generic
 *  accessible name; naming the link itself is more direct and more useful. */
const LOGO_LINK = /(<div class="navbar-brand p-0">\s*<a )(href="\/")(>)/i;

/**
 * The mega-menu's per-city labels, its "Hotels" column header, and the
 * "Luxury Experience" caption on its promotional image panel.
 *
 * All three are headings in the source (two <h6>, one <h5>), and the panel is
 * present (if hidden) in every page's DOM, so its 19 labels front-load the
 * document outline before any real content heading appears. None is a
 * heading in the document-structure sense -- they are labels inside a nav
 * widget -- so they are demoted to `<div>`/`<span>` with the same classes;
 * nothing about how they render changes.
 */
const MEGAMENU_HOTELS_LABEL =
  /<h6([^>]*\bclass="text-prime-dark mb-3"[^>]*)>([\s\S]*?)<\/h6>/gi;
const MEGAMENU_CITY_LABEL =
  /<h6([^>]*\bclass="fw-regular text-prime small text-uppercase pt-1 mb-0"[^>]*)>([\s\S]*?)<\/h6>/gi;
const MEGAMENU_PROMO_LABEL =
  /<h5([^>]*\bclass="text-white fw-regular mb-1"[^>]*)>([\s\S]*?)<\/h5>/gi;

/** Any `<img>` whose `src` names a `/media/<key>` file, tag-boundary aware. */
const MEDIA_IMG_TAG = /<img\b[^>]*\bsrc="\/media\/([^"?#]+)[^"]*"[^>]*>/gi;

/**
 * Every lead form on the site names its fields the same way -- `name`,
 * `email`, `number` (phone), `city`, `message`, `subject` -- but relies on
 * `placeholder` alone to say what each one is. A placeholder disappears the
 * moment the field is focused, so a visitor who pauses mid-entry loses the
 * only hint of what it wants, and a screen reader never gets it at all
 * (WCAG 3.3.2 / 4.1.2). Matched on the `name` attribute rather than tied to
 * one page's markup, so it reaches every form -- contact, consultation,
 * blog sidebar, hotel enquiry, availability -- from one place.
 */
const NAMED_FIELD: Array<{
  tag: RegExp;
  ariaLabel: string;
  autocomplete?: string;
  /** name="number" fields: attribute order varies between templates
   *  (`type="number" name="number"` vs `name="number" type="tel"`), so the
   *  wrong-type fix runs per-match here rather than as a separate ordered
   *  regex pass that only caught one ordering. */
  fixPhoneType?: boolean;
}> = [
  { tag: /<input\b(?![^>]*\btype="hidden")[^>]*\bname="name"[^>]*>/gi, ariaLabel: "Your name", autocomplete: "name" },
  { tag: /<input\b(?![^>]*\btype="hidden")[^>]*\bname="email"[^>]*>/gi, ariaLabel: "Your email address", autocomplete: "email" },
  {
    tag: /<input\b(?![^>]*\btype="hidden")[^>]*\bname="number"[^>]*>/gi,
    ariaLabel: "Your phone number",
    autocomplete: "tel",
    fixPhoneType: true,
  },
  { tag: /<input\b(?![^>]*\btype="hidden")[^>]*\bname="city"[^>]*>/gi, ariaLabel: "Your city", autocomplete: "address-level2" },
  { tag: /<textarea\b[^>]*\bname="message"[^>]*>/gi, ariaLabel: "Your message" },
  { tag: /<select\b[^>]*\bname="subject"[^>]*>/gi, ariaLabel: "Enquiry type" },
];

function addFieldAccessibility(html: string): string {
  let next = html;

  for (const { tag, ariaLabel, autocomplete, fixPhoneType } of NAMED_FIELD) {
    next = next.replace(tag, (match) => {
      let fixed = match;

      if (fixPhoneType) {
        fixed = fixed.replace(/\btype="(?:number|text)"/i, 'type="tel"');
        if (!/\binputmode=/.test(fixed)) fixed = fixed.replace(/\s*\/?>$/, ' inputmode="numeric">');
      }
      if (!/\baria-label=/.test(fixed)) {
        fixed = fixed.replace(/\s*\/?>$/, ` aria-label="${ariaLabel}">`);
      }
      if (autocomplete && !/\bautocomplete=/.test(fixed)) {
        fixed = fixed.replace(/\s*\/?>$/, ` autocomplete="${autocomplete}">`);
      }
      return fixed;
    });
  }

  return next;
}

/**
 * Stamps `width`/`height` on every `/media/`-sourced `<img>` tag that is
 * missing one, using dimensions already on file in the `media` table. A tag
 * that already carries either attribute, or whose key has no backfilled
 * dimensions yet, is left untouched -- this only ever adds information, never
 * overrides what a page already declares.
 */
function stampImageDimensions(html: string, byKey: Map<string, { width: number; height: number }>): string {
  if (!byKey.size) return html;

  return html.replace(MEDIA_IMG_TAG, (tag, key: string) => {
    if (/\bwidth=/.test(tag) || /\bheight=/.test(tag)) return tag;

    let decodedKey = key;
    try {
      decodedKey = decodeURIComponent(key);
    } catch {
      /* use the raw key as-is */
    }

    const dimensions = byKey.get(decodedKey);
    if (!dimensions) return tag;

    return tag.replace(/\s*\/?>$/, ` width="${dimensions.width}" height="${dimensions.height}">`);
  });
}

function splitUrlSuffix(value: string): { path: string; suffix: string } {
  const marker = value.search(/[?#]/);
  if (marker === -1) return { path: value, suffix: "" };
  return { path: value.slice(0, marker), suffix: value.slice(marker) };
}

function pageBaseUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname || ""}`;
  if (path.endsWith("/")) return `https://viraaya.local${path}`;

  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  if (lastSegment.includes(".")) {
    return `https://viraaya.local${path.slice(0, path.lastIndexOf("/") + 1)}`;
  }

  return `https://viraaya.local${path}/`;
}

function mediaPathFor(publicPath: string, suffix = ""): string | null {
  const migrated = legacyMediaPaths[publicPath];
  return migrated ? `${migrated}${suffix}` : null;
}

function rewriteLegacyMediaPaths(html: string, pathname: string): string {
  const baseUrl = pageBaseUrl(pathname || "/");

  return html
    .replace(ABSOLUTE_LEGACY_IMAGE, (value) => {
      const { path, suffix } = splitUrlSuffix(value);
      return mediaPathFor(path, suffix) ?? value;
    })
    .replace(RELATIVE_LEGACY_IMAGE, (value) => {
      const { path, suffix } = splitUrlSuffix(value);
      try {
        const resolved = new URL(path, baseUrl).pathname;
        return mediaPathFor(resolved, suffix) ?? value;
      } catch {
        return value;
      }
    });
}

function deferExternalScripts(html: string): string {
  return html.replace(/<script(\s[^>]*\ssrc="[^"]+"[^>]*)>/gi, (match) => {
    if (/\b(defer|async)\b/i.test(match) || DEFER_EXEMPT.test(match)) return match;
    return match.replace("<script", "<script defer");
  });
}

function enhanceBlogSidebarForm(html: string): string {
  if (!html.includes('id="contactForm"') || html.includes('name="email"')) return html;
  return html.replace(
    '<input type="number" name="number"',
    `${BLOG_FORM_EMAIL_FIELD}\n                        <input type="number" name="number"`,
  );
}

function injectEnhancements(html: string, pathname: string): string {
  let next = html;
  next = next.replace(GTAG_INLINE, "");
  next = deferExternalScripts(next);
  next = enhanceBlogSidebarForm(next);

  if (!next.includes("vw-public-enhancements")) {
    next = next.replace("</head>", `${PUBLIC_ENHANCEMENTS_STYLE}</head>`);
  }

  // Right after <meta charset>, the first tag on every shell: a preload hint
  // only helps if the browser sees it before it would otherwise discover the
  // font (by parsing the stylesheet, which it has not fetched yet at this
  // point) -- appended at the end of head like the rest of this function, it
  // would be no earlier than the browser finding it itself.
  if (!next.includes("font-12.woff2") && next.includes('<meta charset="utf-8">')) {
    next = next.replace('<meta charset="utf-8">', `<meta charset="utf-8">${FONT_PRELOADS}`);
  }

  // Checked against the anchor itself, not the bare "vw-skip-link" substring:
  // the enhancements <style> block just injected above already contains that
  // substring in its ".vw-skip-link{...}" selector, so a plain `includes`
  // here always found it and the anchor was never actually inserted -- the
  // skip link had no working instance on any page.
  if (!next.includes(SKIP_LINK) && next.includes("<body")) {
    next = next.replace(/<body([^>]*)>/i, `<body$1>${SKIP_LINK}`);
  }

  if (!next.includes("/js/cookie-consent.js")) {
    next = next.replace("</head>", '<script src="/js/cookie-consent.js" defer></script></head>');
  }

  if (
    !next.includes("city-filter-mobile.js") &&
    (pathname.startsWith("/destination-wedding/") || pathname === "/hotel-listing")
  ) {
    next = next.replace("</body>", `${CITY_FILTER_SCRIPT}</body>`);
  }

  if (!next.includes('id="main-content"') && next.includes('id="main"')) {
    next = next.replace('id="main"', 'id="main-content"');
  }

  next = next.replace(GO_TOP_BUTTON, '<button id="goTop" type="button"');
  next = next.replace(LOGO_LINK, '$1$2 aria-label="Viraaya Weddings — home"$3');
  next = next.replace(MEGAMENU_HOTELS_LABEL, "<div$1>$2</div>");
  next = next.replace(MEGAMENU_CITY_LABEL, "<div$1>$2</div>");
  next = next.replace(MEGAMENU_PROMO_LABEL, "<span$1>$2</span>");
  next = addFieldAccessibility(next);
  next = next.replace(DEPRECATED_FORM_ACTION, 'action="/api/lead"');

  return next.replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy"$1>');
}

export async function enhancePublicHtml(response: Response, pathname = ""): Promise<Response> {
  if (!isHtmlResponse(response)) return response;

  let html = await response.text();
  html = injectEnhancements(html, pathname);
  html = rewriteLegacyMediaPaths(html, pathname);

  const dimensions = await loadMediaDimensions();
  html = stampImageDimensions(html, dimensions);

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
