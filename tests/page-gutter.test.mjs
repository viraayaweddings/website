import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * The header and every section below it share one page gutter, so the site
 * has a single left and right edge. The rule that does that lives in
 * style.css and is keyed on the element wrapping the page.
 *
 * It used to be keyed on `#main` instead, which was true of every stored page
 * and false of every served one: `decoratePublicHtml` renames that id to
 * `main-content` when it injects the skip link. The rule matched in the
 * repository and matched nothing in production, so the header kept the gutter
 * while the sections fell back to Bootstrap's own padding and ran wider than
 * it. These guard both halves of that mismatch.
 */

const css = readFileSync(new URL("../site-public/user/assets/css/style.css", import.meta.url), "utf8");
const decorator = readFileSync(new URL("../worker/site/public-html.ts", import.meta.url), "utf8");

test("the page id is still rewritten on the way out", () => {
  // The premise of the rule below. If this rename ever goes away, an id-based
  // selector becomes safe again -- but until then it is not.
  assert.match(decorator, /replace\('id="main"', 'id="main-content"'\)/);
});

test("no layout rule is keyed on the id the decorator renames", () => {
  // Comments are blanked rather than dropped so the reported line numbers stay
  // the ones an editor shows.
  const offenders = css
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line, index) => [index + 1, line])
    .filter(([, line]) => /#main\b/.test(line) && !/#main-content\b/.test(line));

  assert.deepEqual(
    offenders,
    [],
    `style.css selects on #main, which is renamed to main-content before the page is served:\n${offenders
      .map(([line, text]) => `  ${line}: ${text.trim()}`)
      .join("\n")}`,
  );
});

test("the gutter rule covers the header and the sections together", () => {
  const rule = css.match(/^\.js-header > \.container,\n(?:.*\n)*?^[^\n]*\{\n(?:[^}]*)\}/m);
  assert.ok(rule, "the shared page-gutter rule is gone from style.css");

  const [selectors, body] = rule[0].split("{");
  for (const selector of [
    ".js-header > .container",
    "main > section > .container",
    "main > section > .container-fluid",
    // Matched by descent: the banner's container hangs off an `.item` slide,
    // one level down on the inner banners and three once slick wraps the
    // homepage carousel in a track of its own.
    "main > section.banner-wrapper .item > .container",
    "main > .banner-bottom-list > .container",
  ]) {
    assert.ok(selectors.includes(selector), `the gutter rule no longer covers ${selector}`);
  }

  assert.match(body, /padding-left: var\(--site-page-gutter\)/);
  assert.match(body, /padding-right: var\(--site-page-gutter\)/);
});

test("the footer keeps Bootstrap's centred container", () => {
  // The footer was drawn against `.container` and is the one piece that does
  // not run to the page edges. Adding it to the rule above would widen it by
  // roughly 150px on a laptop, which is a design change rather than a fix.
  assert.doesNotMatch(css, /^main > footer\.main-footer > \.container/m);

  // Nothing else may take the width off it either.
  const footerWidthRules = css
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .split("}")
    .filter((block) => /footer[^{]*>\s*\.container[^{]*\{/.test(block))
    .filter((block) => /max-width|width\s*:/.test(block.split("{")[1] ?? ""));

  assert.deepEqual(footerWidthRules, [], "something is overriding the footer container's width");
});

/**
 * The banner title starts where the header logo starts. Two page families used
 * to centre it instead, and both are easy to re-centre by accident: the policy
 * pages because one of them carries Bootstrap's `.text-center` in markup this
 * repository does not own, and the destination heroes because centring is the
 * default for the `place-items` shorthand.
 */
test("the policy banner title is left aligned, over Bootstrap's utility class", () => {
  const rule = css.match(/^\.inner-banner \.content h1[^{]*\{([^}]*)\}/m);
  assert.ok(rule, "the .inner-banner heading rule is gone from style.css");
  // `.text-center` is `text-align: center !important`, so this has to match it.
  assert.match(rule[1], /text-align: left !important/);

  const crumb = css.match(/^\.inner-banner \.content \.breadcrumb ul \{([^}]*)\}/m);
  assert.ok(crumb, "the .inner-banner breadcrumb rule is gone from style.css");
  assert.match(crumb[1], /justify-content: flex-start/);
});

test("the destination hero lays its content out from the left", () => {
  const rule = css.match(/^\.hero \{([^}]*)\}/m);
  assert.ok(rule, "the .hero rule is gone from style.css");
  // `place-items: center` alone would centre on both axes; the second keyword
  // keeps the vertical centring and moves the block to the inline start.
  assert.match(rule[1], /place-items: center start/);
  assert.match(rule[1], /text-align: left/);
  // The block starts on the same gutter as the header rather than a fixed inset.
  assert.match(rule[1], /padding: 130px var\(--site-page-gutter\) 90px/);

  for (const [selector, expected] of [
    [/^\.hero h1 \{([^}]*)\}/m, /margin: 0 0 14px/],
    [/^\.hero-desc \{([^}]*)\}/m, /margin: 0 0 38px/],
    [/^\.hero-btns \{([^}]*)\}/m, /justify-content: flex-start/],
  ]) {
    const match = css.match(selector);
    assert.ok(match, `a .hero child rule is gone from style.css: ${selector}`);
    assert.match(match[1], expected);
  }
});
