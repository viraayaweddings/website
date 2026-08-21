/**
 * Public-site HTML transforms: cookie consent, lazy images, inline analytics removal.
 */
import { isHtmlResponse } from "./inject";

const GTAG_INLINE =
  /<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config',\s*'G-8KV1YV2GD8'\);\s*<\/script>/gi;

const SKIP_LINK =
  '<a href="#main-content" class="vw-skip-link">Skip to main content</a>';

const CITY_FILTER_SCRIPT = '<script src="/js/city-filter-mobile.js" defer></script>';

const PUBLIC_ENHANCEMENTS_STYLE = `<style id="vw-public-enhancements">
.vw-skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.vw-skip-link:focus{left:1rem;top:1rem;width:auto;height:auto;padding:.5rem 1rem;background:#111;color:#fff;z-index:2000;border-radius:6px}
@media (max-width:991px){
  .sidebar-mobile-popup{display:none;position:fixed;inset:0;z-index:1050;background:rgba(0,0,0,.45);padding:1rem;overflow:auto}
  .sidebar-mobile-popup.is-open{display:block}
  .sidebar-mobile-popup .sidebar{background:#fff;border-radius:12px;padding:1rem;max-width:420px;margin:3rem auto 0}
}
</style>`;

const BLOG_FORM_EMAIL_FIELD =
  '<input type="email" name="email" placeholder="Your email (optional)" class="form-control" autocomplete="email">';

const DEFER_EXEMPT = /mutation-observer-guard|cookie-consent|lead-forms|gtag|googletagmanager/i;

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

  if (!next.includes("vw-skip-link") && next.includes("<body")) {
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

  return next.replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy"$1>');
}

export async function enhancePublicHtml(response: Response, pathname = ""): Promise<Response> {
  if (!isHtmlResponse(response)) return response;

  let html = await response.text();
  html = injectEnhancements(html, pathname);

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
