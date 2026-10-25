import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { transform } from "../scripts/lib/brand-markup-transform.mjs";
import { PAGE_TEMPLATES } from "../worker/db/page-templates.generated.ts";

/**
 * The stored pages are put on the brand by line rules taken from the brand
 * commits. These guard the properties that make running them on every deploy
 * safe: pages already on the brand are untouched, a second run changes
 * nothing, and a line that differs from the rule -- an admin's edit -- is left
 * as it is.
 */

const rules = JSON.parse(readFileSync("scripts/lib/brand-markup-rules.json", "utf8"));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "admin" && entry !== "vendor") walk(path, out);
    } else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

test("pages and shells already on the brand are left unchanged", () => {
  const changed = [];
  for (const file of walk("site-public")) {
    if (transform(readFileSync(file, "utf8")).changed) changed.push(file);
  }
  for (const template of PAGE_TEMPLATES) {
    if (transform(template.html).changed) changed.push(`shell ${template.key}`);
  }
  assert.deepEqual(changed, []);
});

test("no rule's output is itself rewritten by another rule", () => {
  const keys = new Set(rules.map(([context, before]) => `${context}\u0000${before}`));
  const loops = rules.filter(([context, , after]) => after.some((line) => keys.has(`${context}\u0000${line}`)));
  assert.deepEqual(loops, []);
});

test("a rule rewrites its line in its own rule's context, keeping the indent", () => {
  const [context, before, after] = rules.find(([c, , a]) => c !== "" && a.length === 1);
  const html = `<style>\n${context}\n        ${before}\n}\n</style>`;
  const result = transform(html);
  assert.equal(result.changed, true);
  assert.equal(result.html, `<style>\n${context}\n        ${after[0]}\n}\n</style>`);
  assert.equal(transform(result.html).changed, false);
});

test("the same line in another rule, or edited, is left alone", () => {
  const [context, before] = rules.find(([c, , a]) => c !== "" && a.length === 1);
  const elsewhere = `<style>\n.not-a-brand-rule {\n${before}\n}\n</style>`;
  const edited = `<style>\n${context}\n${before.replace(";", " ;")}\n}\n</style>`;
  assert.equal(transform(elsewhere).changed, false);
  assert.equal(transform(edited).changed, false);
});

test("the old Google Fonts stylesheet link is removed", () => {
  const link = '<link href="/vendor/google-fonts/google-fonts.css" rel="stylesheet" type="text/css" />';
  const result = transform(`<head>\n  <!-- style -->\n  ${link}\n  <title>x</title>\n</head>`);
  assert.equal(result.html, "<head>\n  <!-- style -->\n  <title>x</title>\n</head>");
});
