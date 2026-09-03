import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  BANNED_PATTERNS,
  CONTENT_LINKS,
  isPackagesPath,
  NOINDEX_PATHS,
  transform,
} from "../scripts/lib/unpublish-packages-transform.mjs";

/**
 * The wedding packages area is unpublished, not deleted.
 *
 * Nothing on the site links to it and search is told to skip it, but the pages
 * still answer at their URLs with their content intact -- the tiers may come
 * back repriced, and this is the state that makes putting them back a revert
 * rather than a rebuild.
 *
 * These tests guard the two halves that can quietly stop being true: a link
 * creeping back into a page, and one of the five pages losing its robots tag.
 */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

const PAGES = walk("site-public");

test("nothing on the site links to the packages pages", () => {
  const offenders = [];
  for (const file of PAGES) {
    const html = readFileSync(file, "utf8");
    for (const [pattern, why] of BANNED_PATTERNS) {
      if (pattern.test(html)) offenders.push(`${file}: ${why}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the one remaining link is editorial copy, and is the only one", () => {
  // A blog post links "wedding package price list" mid-sentence. It stays:
  // cutting the anchor would break the sentence, and the live text lives in
  // `blog_posts`, not in this file. This pins that it is still just the one --
  // a second in-body link appearing means someone added it deliberately, and
  // should be told the page is unpublished.
  const inBody = PAGES.filter((file) => {
    const html = readFileSync(file, "utf8");
    return /<a[^>]+href="\/(?:wedding-)?packages?"/.test(html);
  });
  assert.deepEqual(inBody, CONTENT_LINKS);
});

test("the stored shells carry no packages link either", () => {
  const source = readFileSync("worker/db/page-templates.generated.ts", "utf8");
  const shells = [...source.matchAll(/^\s*key: "([^"]+)",\n\s*kind: "[^"]+",\n\s*html: (".*"),$/gm)];
  assert.ok(shells.length > 0);

  for (const [, key, literal] of shells) {
    const html = JSON.parse(literal);
    for (const [pattern, why] of BANNED_PATTERNS) {
      assert.ok(!pattern.test(html), `shell ${key}: ${why}`);
    }
  }
});

test("the generated footer offers no packages link", () => {
  // The footer is rendered at request time, so its link lists are the source
  // for every page -- the markup underneath only shows when injection is off.
  const footer = readFileSync("worker/site/footer.ts", "utf8");
  assert.ok(!/href: "\/(?:wedding-)?packages?"/.test(footer));
});

test("all five unpublished pages tell search engines to skip them", () => {
  for (const path of NOINDEX_PATHS) {
    const file = `site-public${path}index.html`;
    const html = readFileSync(file, "utf8");
    assert.ok(
      html.includes('<meta name="robots" content="noindex, nofollow">'),
      `${file} is unlinked but still indexable`,
    );
    // One directive, not two that contradict each other.
    assert.equal((html.match(/<meta\s+name="robots"/gi) || []).length, 1, `${file}: duplicate robots tag`);
  }
});

test("the pages themselves are untouched -- this is an unpublish, not a delete", () => {
  for (const path of ["/wedding-packages/", "/package/"]) {
    const html = readFileSync(`site-public${path}index.html`, "utf8");
    assert.ok(html.includes('<section class="packages-wrapper">'), `${path} lost its content`);
    for (const tier of ["Shresht", "Siddhi", "Shobhana"]) {
      assert.ok(html.includes(tier), `${path} lost the ${tier} tier`);
    }
  }
});

test("the packages pages are out of the sitemap and the route inventory", () => {
  const sitemap = readFileSync("site-public/sitemap.xml", "utf8");
  const routes = readFileSync("worker/site/static-routes.generated.ts", "utf8");
  for (const path of NOINDEX_PATHS) {
    assert.ok(!sitemap.includes(`${path}<`) && !sitemap.includes(path.replace(/\/$/, "") + "<"), `sitemap lists ${path}`);
    assert.ok(!routes.includes(`"${path}"`), `route inventory lists ${path}`);
  }
});

test("the transform is idempotent, so the deploy pass can run on every deploy", () => {
  for (const file of PAGES.slice(0, 30)) {
    const html = readFileSync(file, "utf8");
    const result = transform(html, isPackagesPath(file));
    assert.deepEqual(result.problems, [], file);
    assert.equal(result.changed, false, `${file} would be rewritten again`);
  }
});

test("a stored row is recognised by its path, however it is written", () => {
  // static_pages keys look like "/wedding-packages"; the file pass passes
  // "site-public/wedding-packages/index.html". Both must resolve, and a shell
  // (which has no path at all) must not.
  for (const path of ["/wedding-packages", "/package", "/wedding-packages/siddhi", "/wedding-packages/"]) {
    assert.equal(isPackagesPath(path), true, path);
  }
  assert.equal(isPackagesPath("site-public/package/index.html"), true);
  assert.equal(isPackagesPath("/about-us"), false);
  assert.equal(isPackagesPath(""), false);
});

test("an existing robots directive is replaced, never duplicated", () => {
  const before = '<head><meta name="robots" content="index, follow"><title>x</title></head>';
  const after = transform(before, true).html;
  assert.equal((after.match(/<meta\s+name="robots"/gi) || []).length, 1);
  assert.ok(after.includes('content="noindex, nofollow"'));
  assert.ok(!after.includes('content="index, follow"'));
});
