/**
 * The site footer, rendered from one place.
 *
 * The footer was markup, cloned into all 292 pages in site-public and into the
 * page_templates rows an admin edits. Redesigning it in the files alone would
 * have drifted from the rows the first time anyone saved a page in the panel,
 * so it is built here and swapped in on the way out, the same way the header's
 * Home item and the mega-menu's city list are.
 *
 * Layout follows the four-column reference: three link columns beside an
 * "about" column whose contact details carry icons, then a rounded card
 * holding the logo, a short nav, the copyright and the social icons. The
 * reference's palette is purple; this is the site's own -- a deep brown field
 * with a gold card -- because every other section of the site is gold on brown
 * and a purple footer would be the only one of its kind.
 *
 * Contact details and social URLs come from `settings`, which the admin panel
 * owns, so this is not a second place they have to be kept up to date. The
 * previous footer only ever showed them on /contact.
 */
import { escapeHtml } from "./escape.ts";
import type { SiteSettings } from "./settings.ts";

/** The one image in the footer, at the size the old markup rendered it. */
const LOGO_SRC = "/media/ae82b1199e2e5dd43672bd0f71716faf5977e181b88059acac644a6aa2d7bf34.png";

interface Link {
  href: string;
  label: string;
}

const EXPLORE: Link[] = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/real-weddings", label: "Real Weddings" },
  // Wedding Packages is unpublished: the pages are still live at their URLs,
  // but nothing on the site links to them and they are noindex. Restoring the
  // section is putting this line and its header counterpart back.
  { href: "/blogs", label: "Blogs" },
  { href: "/contact", label: "Contact Us" },
];

const PLANNING: Link[] = [
  { href: "/wedding-consultation", label: "Book Consultation" },
  { href: "/check-hotel-availability", label: "Hotel Availability Check" },
  { href: "/hotel-cost-calculator", label: "Hotel Cost Calculator" },
  { href: "/hotel-listing?country=india", label: "Indian Venues" },
  { href: "/faqs", label: "FAQs" },
];

/**
 * The legal links, which the old footer carried in a rule-bounded row of their
 * own between the columns and the copyright. They are a column here because
 * the reference has four, and because a link is easier to find in a labelled
 * list than in an unlabelled strip.
 */
const USEFUL: Link[] = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-use", label: "Terms Of Use" },
  { href: "/cookie-preference-policy", label: "Cookie Preferences" },
];

/** The card's own nav, mirroring the reference's second row of links. */
const CARD_NAV: Link[] = [
  { href: "/about-us", label: "About Us" },
  // Unpublished with the rest of the packages links; see EXPLORE above.
  { href: "/real-weddings", label: "Real Weddings" },
  { href: "/blogs", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/**
 * Inline rather than Font Awesome glyphs: the brand icons in the card come
 * from Font Awesome because the stylesheet is already loaded for them, but the
 * pin/phone/envelope are solid-style icons, and nothing else on the site
 * proves that half of the kit is present. An inline path cannot go missing.
 */
const ICON = {
  pin: '<path d="M8 0a5 5 0 0 0-5 5c0 3.5 5 11 5 11s5-7.5 5-11a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>',
  phone:
    '<path d="M3.2 1h2.1l1.1 2.7-1.4 1a9 9 0 0 0 4.3 4.3l1-1.4L13 8.7v2.1a1.2 1.2 0 0 1-1.3 1.2A10.6 10.6 0 0 1 2 2.3 1.2 1.2 0 0 1 3.2 1Z"/>',
  mail: '<path d="M1.5 3h13a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5Zm.9 1L8 8.1 13.6 4H2.4Z"/>',
} as const;

function icon(path: string): string {
  return (
    `<svg class="vw-footer-icon" width="16" height="16" viewBox="0 0 16 16" ` +
    `fill="currentColor" aria-hidden="true" focusable="false">${path}</svg>`
  );
}

function links(items: Link[]): string {
  return items
    .map((item) => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`)
    .join("");
}

/**
 * `h5`, not `h2`, for two reasons. Four column labels are not four top-level
 * sections of the document, and stamping them as `h2` on all 292 pages would
 * put the footer near the top of every page's outline -- the same fault
 * public-html.ts demotes the mega-menu's labels to fix. It is also what the
 * previous footer used, and the site's responsive stylesheet resizes `h2` with
 * `!important` below 768px, which no class selector can override.
 */
function column(title: string, items: Link[]): string {
  return (
    `<div class="col-lg-3 col-md-6 vw-footer-col">` +
    `<h5 class="vw-footer-title">${escapeHtml(title)}</h5>` +
    `<ul class="vw-footer-links">${links(items)}</ul>` +
    `</div>`
  );
}

/** `tel:` wants no spaces; the printed number keeps them. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Returns the footer's markup.
 *
 * `year` is a parameter rather than read from the clock inside, so a test can
 * assert the copyright line without being a year-end time bomb.
 */
export function renderFooter(values: SiteSettings, year: number): string {
  const address = values.addressLines.map(escapeHtml).join("<br>");
  const whatsapp = `https://wa.me/${values.whatsappNumber.replace(/\D/g, "")}`;

  const about =
    `<div class="col-lg-3 col-md-6 vw-footer-col">` +
    `<h5 class="vw-footer-title">About Viraaya</h5>` +
    `<p class="vw-footer-blurb">Every celebration is approached with intention, ` +
    `care, and responsibility.</p>` +
    `<ul class="vw-footer-contact">` +
    `<li>${icon(ICON.pin)}<span>${address}</span></li>` +
    `<li>${icon(ICON.phone)}<a href="${escapeHtml(telHref(values.phone))}">` +
    `${escapeHtml(values.phone)}</a></li>` +
    `<li>${icon(ICON.mail)}<a href="mailto:${escapeHtml(values.email)}">` +
    `${escapeHtml(values.email)}</a></li>` +
    `</ul></div>`;

  const nav = CARD_NAV.map(
    (item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`,
  ).join("");

  // `.social-icon` and the brand hrefs are kept because the admin panel's
  // injection matches on them elsewhere on the site; the values here are
  // already the stored ones, so both routes agree.
  const social =
    `<ul class="social-icon vw-footer-social">` +
    `<li><a href="${escapeHtml(values.instagramUrl)}" target="_blank" rel="noopener noreferrer" ` +
    `aria-label="Viraaya Weddings on Instagram"><i class="fa-brands fa-instagram"></i></a></li>` +
    `<li><a href="${escapeHtml(values.linkedinUrl)}" target="_blank" rel="noopener noreferrer" ` +
    `aria-label="Viraaya Weddings on LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a></li>` +
    `<li><a href="${escapeHtml(whatsapp)}" target="_blank" rel="noopener noreferrer" ` +
    `aria-label="Message Viraaya Weddings on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a></li>` +
    `</ul>`;

  return (
    `<footer class="main-footer vw-footer">` +
    `<div class="container">` +
    `<div class="row vw-footer-grid">` +
    about +
    column("Explore", EXPLORE) +
    column("Planning Tools", PLANNING) +
    column("Useful Links", USEFUL) +
    `</div>` +
    `<div class="vw-footer-card">` +
    `<div class="vw-footer-card-row">` +
    `<a class="vw-footer-logo" href="/" aria-label="Viraaya Weddings — home">` +
    `<img src="${LOGO_SRC}" width="140" height="67" alt="Viraaya Weddings" loading="lazy" decoding="async">` +
    `</a>` +
    `<nav class="vw-footer-nav" aria-label="Footer">${nav}</nav>` +
    `</div>` +
    `<div class="vw-footer-card-row vw-footer-card-base">` +
    `<p class="vw-footer-copy">&copy; Copyright ${year} Viraaya Weddings. All rights reserved.</p>` +
    social +
    `</div>` +
    `</div>` +
    `</div>` +
    `</footer>`
  );
}
