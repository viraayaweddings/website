import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderFooter } from "../worker/site/footer.ts";

/**
 * The footer is built in one place and swapped into every response, so these
 * guard what the old cloned markup could not be guarded against: a link that
 * quietly 404s on all 292 pages at once, a contact detail that stops following
 * the admin panel, and an unescaped stored value.
 */

/**
 * A stand-in for the stored settings rather than the real DEFAULT_SITE_SETTINGS:
 * importing settings.ts pulls in the database client and drizzle, and what is
 * under test here is how a value is rendered, not which value ships.
 */
const SETTINGS = {
  phone: "+91 81302 22141",
  whatsappNumber: "918130222141",
  email: "support@viraayaweddings.com",
  addressLines: ["Chattarpur Mandir Rd, Ansal Villas,", "Satbari, New Delhi,", "Delhi - 110074"],
  instagramUrl: "https://www.instagram.com/viraayaweddings/",
  linkedinUrl: "https://www.linkedin.com/company/viraaya-weddings/",
};
const html = renderFooter(SETTINGS, 2026);

/** Every href the footer renders, query strings and anchors stripped. */
function internalPaths(markup) {
  return [...markup.matchAll(/href="(\/[^"]*)"/g)]
    .map((m) => m[1].split(/[?#]/)[0])
    .filter((path) => path !== "/");
}

test("the footer replaces one element and stays a single footer", () => {
  assert.equal((html.match(/<footer\b/g) || []).length, 1);
  assert.equal((html.match(/<\/footer>/g) || []).length, 1);
  // The rewriter selects on this class pair; losing either would silently stop
  // the swap and leave the cloned footer in place.
  assert.match(html, /<footer class="main-footer vw-footer">/);
});

test("every footer link points at a page that exists", () => {
  const paths = internalPaths(html);
  assert.ok(paths.length >= 15, `expected the full link set, found ${paths.length}`);

  for (const path of paths) {
    const slug = path.replace(/^\/|\/$/g, "");
    const found =
      existsSync(join("site-public", slug, "index.html")) ||
      existsSync(join("site-public", `${slug}.html`));
    assert.ok(found, `${path} has no page under site-public`);
  }
});

test("the footer links to the canonical wedding packages page", () => {
  // /package exists but carries <link rel="canonical" href="/wedding-packages">.
  // The previous footer linked to it from every page on the site.
  const canonical = readFileSync("site-public/package/index.html", "utf8");
  assert.match(canonical, /<link rel="canonical" href="\/wedding-packages"/);
  assert.doesNotMatch(html, /href="\/package"/);
  assert.match(html, /href="\/wedding-packages"/);
});

test("contact details and social links come from settings", () => {
  assert.ok(html.includes(SETTINGS.phone), "phone number missing");
  assert.ok(html.includes(`mailto:${SETTINGS.email}`), "email missing");
  assert.ok(html.includes(SETTINGS.addressLines[0]), "address missing");
  assert.ok(html.includes(SETTINGS.instagramUrl), "instagram url missing");
  assert.ok(html.includes(SETTINGS.linkedinUrl), "linkedin url missing");
  assert.ok(html.includes(SETTINGS.whatsappNumber.replace(/\D/g, "")), "whatsapp missing");

  // `tel:` cannot carry the spaces the printed number has.
  const tel = html.match(/href="(tel:[^"]*)"/)[1];
  assert.doesNotMatch(tel, /\s/);
});

test("a changed setting reaches the footer", () => {
  const changed = renderFooter(
    { ...SETTINGS, phone: "+91 90000 00000", email: "hello@example.com" },
    2026,
  );
  assert.ok(changed.includes("+91 90000 00000"));
  assert.ok(changed.includes("mailto:hello@example.com"));
  assert.ok(!changed.includes(SETTINGS.phone));
});

test("stored values are escaped", () => {
  const hostile = renderFooter(
    { ...SETTINGS, email: '"><script>alert(1)</script>', phone: "<b>x</b>" },
    2026,
  );
  assert.doesNotMatch(hostile, /<script>/);
  assert.doesNotMatch(hostile, /<b>x<\/b>/);
});

test("the column labels are not h2, so the page outline is unchanged", () => {
  // Four column labels stamped as <h2> would put the footer near the top of
  // every page's outline; the site's responsive CSS also resizes h2 with
  // !important below 768px, which no class selector can override.
  assert.doesNotMatch(html, /<h2\b/);
  assert.equal((html.match(/<h5 class="vw-footer-title">/g) || []).length, 4);
});

test("the copyright carries the year it is given", () => {
  assert.match(renderFooter(SETTINGS, 2031), /&copy; Copyright 2031 Viraaya Weddings/);
});

test("the stylesheet defines every class the markup uses", () => {
  const css = readFileSync("site-public/user/assets/css/style.css", "utf8");
  const classes = new Set(
    [...html.matchAll(/class="([^"]*)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter((name) => name.startsWith("vw-footer")),
  );
  assert.ok(classes.size >= 10, `expected the footer's classes, found ${classes.size}`);
  for (const name of classes) {
    assert.ok(css.includes(`.${name}`), `.${name} is used but never styled`);
  }
});

test("the stylesheet's braces balance", () => {
  // A stray closing brace does not fail loudly: the parser discards rules until
  // it resynchronises, so the declarations after it are silently dropped and
  // the page simply lays out wrong. One did exactly that to
  // .vw-footer-card-row while this footer was being built.
  const css = readFileSync("site-public/user/assets/css/style.css", "utf8");
  let depth = 0;
  let line = 1;
  for (const ch of css) {
    if (ch === "\n") line += 1;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      assert.ok(depth >= 0, `unmatched closing brace at line ${line}`);
    }
  }
  assert.equal(depth, 0, `${depth} block(s) left open`);
});

test("the card's layout rules survive to the end of the file", () => {
  const css = readFileSync("site-public/user/assets/css/style.css", "utf8");
  // These three are what a discarded rule cost last time: without them the card
  // rows fall back to block layout and every element stacks full width.
  for (const rule of [".vw-footer-card-row", ".vw-footer-card-base", ".vw-footer-social"]) {
    assert.ok(css.includes(rule), `${rule} is missing from the stylesheet`);
  }
  assert.match(css, /\.vw-footer-card-row\s*\{[^}]*display:\s*flex/);
});

test("the sheen is disabled for reduced motion", () => {
  const css = readFileSync("site-public/user/assets/css/style.css", "utf8");
  const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(block.slice(0, 200), /\.vw-footer-card::before\s*\{[^}]*animation:\s*none/);
});
