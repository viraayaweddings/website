import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Nothing a page shows may come from a file.
 *
 * The calculator's prices, cities, room caps, currencies and tax rates, and the
 * venue listing's cards, order and wedding types, all live in Postgres. They
 * reach a page either through a JSON endpoint or through the per-request
 * injection in worker/site/calculator-inject.ts and
 * worker/site/venue-listing-inject.ts. These tests guard the two ways that
 * quietly stops being true: a value creeping back into the page markup, and the
 * generated shells drifting from the site-public originals they mirror.
 *
 * They read files only, so they run in CI with no database.
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

/**
 * The venue pages and the city index pages, counted rather than written down.
 *
 * Both used to be fixed numbers here, which turned withdrawing a city into two
 * unrelated-looking test failures. What these tests are actually guarding is
 * that no page in the set has quietly lost its calculator or its filter, so the
 * set is what they should be measured against.
 */
const CITY_INDEX_PAGES = PAGES.filter((file) =>
  /destination-wedding[\\/][^\\/]+[\\/]index\.html$/.test(file),
);
const VENUE_PAGES = PAGES.filter((file) =>
  /destination-wedding[\\/][^\\/]+[\\/][^\\/]+[\\/]index\.html$/.test(file),
);

/** Pages outside the venue set that carry a cost calculator of their own. */
const STANDALONE_CALCULATORS = 13;

test("no page hardcodes a tax rate", () => {
  const offenders = PAGES.filter((file) => {
    const html = readFileSync(file, "utf8");
    if (!/id="calculateCost"/.test(html)) return false;
    return /\b0\.09\b/.test(html) || /\* 1\.18\b/.test(html) || /CGST \(9%\)|SGST \(9%\)/.test(html);
  });
  assert.deepEqual(offenders, [], "tax rates come from calculator_taxes");
});

test("no page filters cities through a hardcoded allowlist", () => {
  const offenders = PAGES.filter((file) => /indiaCityIds/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, [], "publication in calculator_cities is what hides a city");
});

test("no page hardcodes an INR exchange rate", () => {
  const offenders = PAGES.filter((file) => /rate_to_usd \|\| 83\.50/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, [], "currency conversion rates come from calculator_currencies");
});

test("no city picker carries its own option list", () => {
  const offenders = PAGES.filter((file) => {
    const html = readFileSync(file, "utf8");
    const select = html.match(/<select[^>]*\bid="citySelect"[^>]*>([\s\S]*?)<\/select>/);
    return select ? /<option value="\d/.test(select[1]) : false;
  });
  assert.deepEqual(offenders, [], "the options are injected from calculator_cities");
});

test("every calculator reaches the shared tax helper", () => {
  // A page that totals a quote must ask ViraayaTax for the rate. Finding one
  // that computes a total without it means a copy was missed.
  const calculators = PAGES.filter((file) => {
    const html = readFileSync(file, "utf8");
    return /id="calculateCost"/.test(html);
  });
  assert.ok(
    calculators.length >= VENUE_PAGES.length + STANDALONE_CALCULATORS,
    `expected the full set of calculators, found ${calculators.length}`,
  );

  const missing = calculators.filter((file) => !/ViraayaTax\./.test(readFileSync(file, "utf8")));
  assert.deepEqual(missing, [], "every calculator totals through ViraayaTax");
});

test("the static data files are gone", () => {
  for (const path of ["site-public/data/calculator", "site-public/data/hotel-listing-data.json"]) {
    assert.throws(
      () => statSync(path),
      `a second copy of ${path} on disk is what an admin edit cannot reach`,
    );
  }
});

test("the Vercel shell proxy drops stale transport encoding headers", () => {
  const route = readFileSync("app/[[...path]]/route.ts", "utf8");
  assert.match(route, /headers\.delete\("content-encoding"\)/);
  assert.match(route, /headers\.delete\("content-length"\)/);
  assert.match(route, /withoutTransportEncoding\(response\)/);
});

test("no page carries its own wedding-type filter list", () => {
  const offenders = PAGES.filter((file) => /name="wedding_types\[\]"/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, [], "the checkboxes are injected from venue_types");
});

test("every page with the filter still has a container to inject into", () => {
  // Stripping the checkboxes without leaving #weddingType behind would remove
  // the filter permanently rather than move where it comes from.
  const listingPages = PAGES.filter((file) => /data-bs-target="#weddingType"/.test(readFileSync(file, "utf8")));
  assert.equal(
    listingPages.length,
    CITY_INDEX_PAGES.length + 1,
    "expected /hotel-listing plus every city index page",
  );

  const broken = listingPages.filter((file) => {
    const html = readFileSync(file, "utf8");
    return !/<div id="weddingType"[^>]*>\s*<div class="accordion-body">/.test(html);
  });
  assert.deepEqual(broken, [], "the accordion body must survive the strip");
});

test("the generated shells match the sources they were taken from", async () => {
  const { PAGE_TEMPLATES } = await import("../worker/db/page-templates.generated.ts");

  // The venue pages and the home page render from these, so a shell still
  // carrying an old value ships to visitors even though every source file is
  // clean -- the failure the site-public checks above cannot see.
  const stale = PAGE_TEMPLATES.filter(
    (template) =>
      /grandTotal \* 0\.09/.test(template.html) ||
      /\* 1\.18\b/.test(template.html) ||
      /indiaCityIds/.test(template.html) ||
      /rate_to_usd \|\| 83\.50/.test(template.html),
  ).map((template) => template.key);
  assert.deepEqual(stale, [], "run scripts/detach-hardcoded-data.mjs --apply");

  const bakedCities = PAGE_TEMPLATES.filter((template) => {
    const select = template.html.match(/<select[^>]*\bid="citySelect"[^>]*>([\s\S]*?)<\/select>/);
    return select ? /<option value="\d/.test(select[1]) : false;
  }).map((template) => template.key);
  assert.deepEqual(bakedCities, [], "the shells must not carry a city list either");
});

test("the tax safety net is valid JavaScript and never invents a rate", () => {
  const source = readFileSync("worker/site/calculator-inject.ts", "utf8");
  const start = source.indexOf("const TAX_SAFETY_NET = [");
  assert.ok(start > -1, "expected the safety net to still exist");
  const body = source.slice(source.indexOf("[", start), source.indexOf('].join("");', start) + 1);

  // Evaluated the way the browser will see it: one concatenated string.
  const js = JSON.parse(JSON.stringify(eval(body))).join("");
  const window = {};
  new Function("window", js)(window);

  assert.equal(window.ViraayaTax.available(), false);
  assert.equal(window.ViraayaTax.multiplier(), 1, "no tax may be assumed");
  assert.equal(window.ViraayaTax.total(1000), 1000, "the fallback must not mark a quote up");
  assert.match(window.ViraayaTax.totalNote(), /quote/);
  assert.match(window.ViraayaTax.rowsHtml(1000, (value) => `Rs${value}`), /Rs1000/);
});

/**
 * The transform itself, against the markup as it was before the change.
 *
 * scripts/migrate-stored-pages.mjs runs this over the rows in
 * `page_templates` and `static_pages`, which still hold the original markup
 * until it does. The source-file checks above cannot see that pass working, so
 * these fixtures stand in for it -- one per code shape, in the CRLF the stored
 * rows actually carry.
 */
const { transform } = await import("../scripts/lib/page-data-transform.mjs");

const VENUE_BEFORE = [
  "    var cgst         = grandTotal * 0.09;",
  "var sgst         = grandTotal * 0.09;",
  "var totalGst     = cgst + sgst;",
  "var grandWithGst = grandTotal + totalGst;",
  "",
  "html += '  <div class=\"d-flex justify-content-between mb-1\" style=\"font-size:13px;color:#666;\">';",
  "html += '    <span>Subtotal (Before GST)</span>';",
  "html += '    <span class=\"fw-600 text-dark\">' + cf(grandTotal) + '</span>';",
  "html += '  </div>';",
  "html += '  <div class=\"d-flex justify-content-between mb-1\" style=\"font-size:13px;color:#666;\">';",
  "html += '    <span>CGST (9%)</span>';",
  "html += '    <span class=\"fw-600 text-dark\">' + cf(cgst) + '</span>';",
  "html += '  </div>';",
  "html += '  <div class=\"d-flex justify-content-between mb-1\" style=\"font-size:13px;color:#666;\">';",
  "html += '    <span>SGST (9%)</span>';",
  "html += '    <span class=\"fw-600 text-dark\">' + cf(sgst) + '</span>';",
  "html += '  </div>';",
  "html += '  <span style=\"font-size:14px;font-weight:600;color:#2d2d2d;\">Total Estimated Cost " +
    "<small style=\"font-size:11px;color:#999;\">(incl. GST)</small></span>';",
].join("\r\n");

const PICKER_BEFORE = [
  "    var cgst       = grandTotal * 0.09;",
  "var sgst       = grandTotal * 0.09;",
  "var totalGst   = cgst + sgst;",
  "var grandWithGst = grandTotal + totalGst;",
  "body += `",
  '    <div class="d-flex justify-content-between mb-1" style="font-size:13px;color:#666;">',
  "        <span>Subtotal (Before GST)</span>",
  '        <span class="fw-600 text-dark">${convertAndFormat(grandTotal)}</span>',
  "    </div>",
  '    <div class="d-flex justify-content-between mb-1" style="font-size:13px;color:#666;">',
  "        <span>CGST (9%)</span>",
  '        <span class="fw-600 text-dark">${convertAndFormat(cgst)}</span>',
  "    </div>",
  '    <div class="d-flex justify-content-between mb-1" style="font-size:13px;color:#666;">',
  "        <span>SGST (9%)</span>",
  '        <span class="fw-600 text-dark">${convertAndFormat(sgst)}</span>',
  "    </div>",
  '    <small style="font-size:11px;color:#999;">(incl. GST)</small>`;',
].join("\r\n");

const COMPARE_BEFORE =
  '    bodyHtml += `<tr style="background:#FFF8F3;">\r\n' +
  '        <td class="px-3 py-2" style="font-size:12px;color:#8A7358;">CGST (9%)</td>\r\n' +
  '        <td style="background:#fafafa;"></td>`;\r\n' +
  "    selectedHotels.forEach(function (h) {\r\n" +
  "        const val  = totals[h.id] || 0;\r\n" +
  "        bodyHtml += `<td>${val > 0 ? formatINR(val * 0.09) : '—'}</td>`;\r\n" +
  "    });\r\n" +
  "    bodyHtml += `</tr>`;\r\n" +
  '    bodyHtml += `<tr style="background:#FFF8F3;">\r\n' +
  '        <td class="px-3 py-2" style="font-size:12px;color:#8A7358;">SGST (9%)</td>\r\n' +
  '        <td style="background:#fafafa;"></td>`;\r\n' +
  "    selectedHotels.forEach(function (h) {\r\n" +
  "        const val  = totals[h.id] || 0;\r\n" +
  "        bodyHtml += `<td>${val > 0 ? formatINR(val * 0.09) : '—'}</td>`;\r\n" +
  "    });\r\n" +
  "    bodyHtml += `</tr>`;\r\n" +
  "    selectedHotels.forEach(h => { grandTotals[h.id] = (totals[h.id] || 0) * 1.18; });\r\n" +
  '    <small class="d-block" style="font-size:10px;color:#94a3b8;font-weight:400;">(incl. 18% GST)</small>';

const CITY_SELECT_BEFORE =
  '<select class="form-control" id="citySelect">\r\n' +
  '<option value="">Select a City</option>\r\n' +
  '<option value="8">Agra</option>\r\n' +
  '<option value="7">Goa</option>\r\n' +
  "</select>";

const ALLOWLIST_BEFORE = [
  "    var indiaCityIds = new Set([",
  "        '8','28','70'",
  "    ]);",
  "",
  "    $('#citySelect option').each(function () {",
  "        var value = String($(this).val() || '');",
  "        if (value && !indiaCityIds.has(value)) $(this).remove();",
  "    });",
  "    $('#citySelect').val('').trigger('change.select2');",
].join("\r\n");

const CURRENCY_BEFORE = [
  "    const selectedCode  = localStorage.getItem('selected_currency') || 'INR';",
  "    const allCurrencies = window.__currencies || [];",
  "    const INR_RATE      = allCurrencies.find(c => c.code === 'INR')?.rate_to_usd || 83.50;",
  "    const toCurrency    = allCurrencies.find(c => c.code === selectedCode)",
  "                       || { code: 'INR', symbol: '₹', rate_to_usd: INR_RATE };",
  "",
  "    function cf(inrAmount) {",
  "        const usd       = inrAmount / INR_RATE;",
  "        const converted = usd * toCurrency.rate_to_usd;",
  "        if (toCurrency.code === 'INR') {",
  "            return '₹' + Math.round(converted).toLocaleString('en-IN');",
  "        }",
  "        return toCurrency.symbol + ' ' + new Intl.NumberFormat('en-US', {",
  "            minimumFractionDigits: 2,",
  "            maximumFractionDigits: 2,",
  "        }).format(converted);",
  "    }",
].join("\r\n");

test("the venue copy loses its hardcoded rate", () => {
  const { html, problems, changed } = transform(VENUE_BEFORE);
  assert.deepEqual(problems, []);
  assert.ok(changed);
  assert.match(html, /var grandWithGst = ViraayaTax\.total\(grandTotal\);/);
  assert.match(html, /html \+= ViraayaTax\.rowsHtml\(grandTotal, cf\);/);
  // Inside single quotes, `${...}` is literal text, so this copy must
  // concatenate instead.
  assert.match(html, /\(' \+ ViraayaTax\.totalNote\(\) \+ '\)/);
  assert.doesNotMatch(html, /0\.09/);
  assert.doesNotMatch(html, /CGST \(9%\)/);
});

test("the picker copy loses its hardcoded rate", () => {
  const { html, problems, changed } = transform(PICKER_BEFORE);
  assert.deepEqual(problems, []);
  assert.ok(changed);
  assert.match(html, /\$\{ViraayaTax\.rowsHtml\(grandTotal, convertAndFormat\)\}/);
  assert.match(html, /\$\{ViraayaTax\.totalNote\(\)\}/);
  assert.doesNotMatch(html, /0\.09/);
});

test("the comparison copy loses its hardcoded tax values", () => {
  const { html, problems } = transform(COMPARE_BEFORE);
  assert.deepEqual(problems, []);
  assert.match(html, /\* ViraayaTax\.multiplier\(\)/);
  assert.match(html, /ViraayaTax\.lines\(100\)/);
  assert.doesNotMatch(html, /1\.18/);
  assert.doesNotMatch(html, /\b0\.09\b/);
  assert.doesNotMatch(html, /CGST \(9%\)|SGST \(9%\)/);
});

test("a baked city list is reduced to its placeholder", () => {
  const { html, problems } = transform(CITY_SELECT_BEFORE);
  assert.deepEqual(problems, []);
  assert.doesNotMatch(html, /value="8"/);
  assert.match(html, /<option value="">Select a City<\/option>/);
});

test("the city allowlist goes, the reset it guarded stays", () => {
  const { html, problems } = transform(ALLOWLIST_BEFORE);
  assert.deepEqual(problems, []);
  assert.doesNotMatch(html, /indiaCityIds/);
  assert.match(html, /\$\('#citySelect'\)\.val\(''\)\.trigger\('change\.select2'\);/);
});

test("the inline currency converter loses its exchange-rate fallback", () => {
  const { html, problems, changed } = transform(CURRENCY_BEFORE);
  assert.deepEqual(problems, []);
  assert.ok(changed);
  assert.doesNotMatch(html, /83\.50/);
  assert.match(html, /parseFloat\(inrCurrency && inrCurrency\.rate_to_usd\) \|\| 0/);
  assert.match(html, /if \(!INR_RATE \|\| !toCurrency\)/);
});

test("the transform is idempotent, so the database pass can run every deploy", () => {
  for (const before of [VENUE_BEFORE, PICKER_BEFORE, COMPARE_BEFORE, CITY_SELECT_BEFORE, ALLOWLIST_BEFORE, CURRENCY_BEFORE]) {
    const once = transform(before);
    const twice = transform(once.html);
    assert.equal(twice.changed, false);
    assert.deepEqual(twice.problems, []);
  }
});

test("markup with no calculator in it is left alone", () => {
  const page = "<html><body><h1>Privacy policy</h1><p>Nothing to price here.</p></body></html>";
  const { html, changed, problems } = transform(page);
  assert.equal(changed, false);
  assert.equal(html, page);
  assert.deepEqual(problems, []);
});

const WEDDING_FILTER_BEFORE = [
  '<div class="accordion-item">',
  '    <h2 class="accordion-header">',
  '        <button data-bs-toggle="collapse" data-bs-target="#weddingType">Wedding Type</button>',
  "    </h2>",
  '    <div id="weddingType" class="accordion-collapse collapse show">',
  '        <div class="accordion-body">',
  '            <div class="form-check mb-2">',
  '                <input class="form-check-input filter-checkbox" type="checkbox"',
  '                       name="wedding_types[]"',
  '                       value="3"',
  "                       >",
  '                <label class="form-check-label">City Wedding</label>',
  "            </div>",
  '            <div class="form-check mb-2">',
  '                <input class="form-check-input filter-checkbox" type="checkbox"',
  '                       name="wedding_types[]"',
  '                       value="2"',
  "                       >",
  '                <label class="form-check-label">Destination Wedding</label>',
  "            </div>",
  "        </div>",
  "    </div>",
  "</div>",
].join("\r\n");

test("the wedding-type filter loses its baked checkboxes", () => {
  const { html, problems, changed } = transform(WEDDING_FILTER_BEFORE);
  assert.deepEqual(problems, []);
  assert.ok(changed);
  assert.doesNotMatch(html, /wedding_types/);
  assert.match(html, /<div id="weddingType"[^>]*>\s*<div class="accordion-body">/);
});

test("stripping the filter leaves the markup balanced", () => {
  // The first attempt matched the accordion body's closing tag lazily, stopped
  // at the last checkbox's instead, and left every one of the 54 pages one
  // </div> heavy — markup that still renders but nests wrongly.
  const count = (value, pattern) => (value.match(pattern) || []).length;
  const before = count(WEDDING_FILTER_BEFORE, /<div\b/g) - count(WEDDING_FILTER_BEFORE, /<\/div>/g);
  const after = (() => {
    const { html } = transform(WEDDING_FILTER_BEFORE);
    return count(html, /<div\b/g) - count(html, /<\/div>/g);
  })();
  assert.equal(before, 0, "the fixture itself must be balanced");
  assert.equal(after, 0, "and so must the result");
});

test("the wedding-type strip is idempotent", () => {
  const once = transform(WEDDING_FILTER_BEFORE);
  const twice = transform(once.html);
  assert.equal(twice.changed, false);
  assert.deepEqual(twice.problems, []);
});
