/**
 * Detaches one page's markup from the data that was compiled into it.
 *
 * Four things lived in the page markup rather than in the database:
 *
 *   1. the tax rates -- CGST 9% and SGST 9% written out as literal summary rows
 *      in four copies, and the same 18% as a bare `* 1.18` on /compare-hotel;
 *   2. an allowlist of "India" city ids on the home page, which deleted any
 *      <option> the array did not name;
 *   3. the city list itself -- 53 literal <option> rows in `#citySelect` on the
 *      12 pages carrying the full picker;
 *   4. the wedding-type filter -- six literal checkboxes in `#weddingType` on
 *      /hotel-listing and all 53 city index pages;
 *   5. a hardcoded INR exchange-rate fallback in the inline currency formatters.
 *
 * All four become calls into `ViraayaTax` (currency-switcher.js) and empty
 * containers that worker/site/calculator-inject.ts and
 * worker/site/venue-listing-inject.ts fill from `calculator_cities`,
 * `calculator_taxes` and `venue_types` on every request.
 *
 * This lives on its own because the same markup exists in three places that
 * must not drift, and each is reached differently:
 *
 *   - site-public/**\/*.html            scripts/detach-hardcoded-data.mjs
 *   - worker/db/page-templates.generated.ts  (same script)
 *   - page_templates / static_pages rows     scripts/migrate-stored-pages.mjs
 *
 * `transform` is idempotent and reports rather than throws, so the database
 * pass can run on every deploy: it rewrites a row the first time and is a no-op
 * afterwards, and it edits the stored markup in place rather than replacing the
 * page, so an admin's own edits to those pages survive.
 */

/** Markers that make a page worth transforming at all. */
export const PAGE_DATA_MARKER =
  /indiaCityIds|\b0\.09\b|CGST \(9%\)|SGST \(9%\)|totals\[h\.id\] \|\| 0\) \* 1\.18|id="citySelect"|name="wedding_types\[\]"|rate_to_usd \|\| 83\.50/;

/** Values that must not survive anywhere. Used by the audit too. */
export const BANNED_PATTERNS = [
  [/\b0\.09\b/, "hardcoded 9% tax"],
  [/CGST \(9%\)|SGST \(9%\)/, "hardcoded tax labels"],
  [/\* 1\.18\b/, "hardcoded 18% tax multiplier"],
  [/indiaCityIds/, "hardcoded city allowlist"],
  [/rate_to_usd \|\| 83\.50/, "hardcoded INR exchange rate"],
];

export const BAKED_CITY_OPTIONS =
  /<select[^>]*\bid="citySelect"[^>]*>[\s\S]*?<option value="\d[\s\S]*?<\/select>/;

/** A filter list that still carries its own checkboxes is a second source. */
export const BAKED_WEDDING_TYPES = /name="wedding_types\[\]"/;

const TAX_VARS =
  /var cgst\s*=\s*grandTotal \* 0\.09;\s*var sgst\s*=\s*grandTotal \* 0\.09;\s*(?:var totalGst\s*=\s*cgst \+ sgst;\s*)?var grandWithGst\s*=\s*grandTotal \+ (?:totalGst|cgst \+ sgst);/;

/** The three summary rows, template-literal form (home, /hotel-cost-calculator, landing pages). */
const ROW_TPL = (label, value) =>
  new RegExp(
    String.raw`\s*<div class="d-flex justify-content-between mb-1" style="font-size:13px;color:#666;">\s*` +
      String.raw`<span>${label}</span>\s*` +
      String.raw`<span class="fw-600 text-dark">\$\{convertAndFormat\(${value}\)\}</span>\s*` +
      String.raw`</div>`,
  );

/** The same three rows, string-concatenation form (venue pages). */
const ROW_CONCAT = (label, value) =>
  new RegExp(
    String.raw`\s*html \+= '  <div class="d-flex justify-content-between mb-1" style="font-size:13px;color:#666;">';\s*` +
      String.raw`html \+= '    <span>${label}</span>';\s*` +
      String.raw`html \+= '    <span class="fw-600 text-dark">' \+ cf\(${value}\) \+ '</span>';\s*` +
      String.raw`html \+= '  </div>';`,
  );

const CITY_SELECT = /(<select[^>]*\bid="citySelect"[^>]*>)([\s\S]*?)(<\/select>)/;

const COMPARE_TAX_ROWS =
  /\s*bodyHtml \+= `<tr style="background:#FFF8F3;">\s*<td class="px-3 py-2" style="font-size:12px;color:#8A7358;">CGST \(9%\)<\/td>[\s\S]*?bodyHtml \+= `<\/tr>`;\s*bodyHtml \+= `<tr style="background:#FFF8F3;">\s*<td class="px-3 py-2" style="font-size:12px;color:#8A7358;">SGST \(9%\)<\/td>[\s\S]*?bodyHtml \+= `<\/tr>`;/;

const COMPARE_TAX_ROWS_REPLACEMENT = `
    ViraayaTax.lines(100).forEach(function (tax) {
        const percent = Number(tax.amount) || 0;
        const label = \`\${tax.label} (\${percent}%)\`.replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });

        bodyHtml += \`<tr style="background:#FFF8F3;">
            <td class="px-3 py-2" style="font-size:12px;color:#8A7358;">\${label}</td>
            <td style="background:#fafafa;"></td>\`;
        selectedHotels.forEach(function (h) {
            const val = totals[h.id] || 0;
            bodyHtml += \`<td class="px-3 py-2" style="font-size:13px;color:#8A7358;text-align:right;">\${val > 0 ? formatINR(val * percent / 100) : '—'}</td>\`;
        });
        bodyHtml += \`</tr>\`;
    });`;

/**
 * One wedding-type checkbox.
 *
 * Matched individually rather than by emptying the accordion body: a lazy match
 * for the body's own `</div>` stops at the last checkbox's instead, which
 * leaves the markup one closing tag heavy. A `form-check` block nests nothing,
 * so its own close is unambiguous.
 */
const WEDDING_TYPE_CHECKBOX =
  /\s*<div class="form-check mb-2">\s*<input[^>]*name="wedding_types\[\]"[\s\S]*?<\/div>/g;

const ALLOWLIST_DECL = /\s*var indiaCityIds = new Set\(\[[\s\S]*?\]\);/;
const ALLOWLIST_FILTER =
  /\s*\$\('#citySelect option'\)\.each\(function \(\) \{\s*var value = String\(\$\(this\)\.val\(\) \|\| ''\);\s*if \(value && !indiaCityIds\.has\(value\)\) \$\(this\)\.remove\(\);\s*\}\);/;

const CURRENCY_RATE_SETUP =
  /const INR_RATE\s*=\s*allCurrencies\.find\(c => c\.code === 'INR'\)\?\.rate_to_usd \|\| 83\.50;\s*const toCurrency\s*=\s*allCurrencies\.find\(c => c\.code === selectedCode\)\s*\|\| \{ code: 'INR', symbol: '₹', rate_to_usd: INR_RATE \};/g;

const CURRENCY_RATE_REPLACEMENT = [
  "const inrCurrency  = allCurrencies.find(c => c.code === 'INR');",
  "    const INR_RATE     = parseFloat(inrCurrency && inrCurrency.rate_to_usd) || 0;",
  "    const toCurrency   = allCurrencies.find(c => c.code === selectedCode) || inrCurrency || null;",
].join("\n");

const CONVERSION_CALC =
  /const usd\s*=\s*inrAmount \/ INR_RATE;\s*const converted\s*=\s*usd \* toCurrency\.rate_to_usd;/g;

const CONVERSION_REPLACEMENT = [
  "if (!INR_RATE || !toCurrency) {",
  "            return '₹' + Math.round(inrAmount).toLocaleString('en-IN');",
  "        }",
  "        const usd       = inrAmount / INR_RATE;",
  "        const converted = usd * toCurrency.rate_to_usd;",
].join("\n");

/**
 * Rewrites one page.
 *
 * Returns the new markup and any pattern that was expected but not found. A
 * miss is reported, never guessed at: leaving a page half-converted would have
 * it quote a rate nobody can edit, which is the thing being removed.
 */
export function transform(html) {
  const problems = [];
  let out = html;

  const swap = (label, pattern, replacement, { expect = 1 } = {}) => {
    const found = out.match(pattern);
    const count = found ? (pattern.global ? found.length : 1) : 0;
    if (count !== expect) {
      problems.push(`"${label}" matched ${count}x, expected ${expect}`);
      return;
    }
    out = out.replace(pattern, replacement);
  };

  // --- the India allowlist (home page only) --------------------------------
  if (/indiaCityIds/.test(out)) {
    swap("allowlist filter", ALLOWLIST_FILTER, "");
    swap(
      "allowlist declaration",
      ALLOWLIST_DECL,
      "\n    // The city list is injected from calculator_cities; nothing here filters it.",
    );
  }

  // --- the baked city list -------------------------------------------------
  if (/id="citySelect"/.test(out)) {
    const match = out.match(CITY_SELECT);
    if (!match) {
      problems.push("found #citySelect but could not read its <select> block");
    } else if (/<option value="\d/.test(match[2])) {
      out = out.replace(
        CITY_SELECT,
        (whole, open, inner, close) => `${open}\n<option value="">Select a City</option>\n${close}`,
      );
    }
  }

  // --- the wedding-type filter list ----------------------------------------
  if (/name="wedding_types\[\]"/.test(out)) {
    if (!/<div id="weddingType"[^>]*>/.test(out)) {
      problems.push('found wedding_types[] checkboxes with no #weddingType container to inject into');
    } else {
      const before = out;
      out = out.replace(WEDDING_TYPE_CHECKBOX, "");
      if (/name="wedding_types\[\]"/.test(out)) {
        problems.push("some wedding_types[] checkboxes are not plain form-check blocks");
        out = before;
      }
    }
  }

  // --- inline currency conversion -----------------------------------------
  if (/rate_to_usd \|\| 83\.50/.test(out)) {
    const setupMatches = out.match(CURRENCY_RATE_SETUP);
    if (!setupMatches) {
      problems.push("found a hardcoded exchange rate but could not rewrite its currency setup");
    } else {
      out = out.replace(CURRENCY_RATE_SETUP, CURRENCY_RATE_REPLACEMENT);
    }

    const calcMatches = out.match(CONVERSION_CALC);
    if (!calcMatches) {
      problems.push("found a hardcoded exchange rate but could not guard its conversion math");
    } else {
      out = out.replace(CONVERSION_CALC, CONVERSION_REPLACEMENT);
    }
  }

  // --- the tax rates -------------------------------------------------------
  const isVenueCopy = ROW_CONCAT("Subtotal \\(Before GST\\)", "grandTotal").test(out);
  const isPickerCopy = ROW_TPL("Subtotal \\(Before GST\\)", "grandTotal").test(out);
  const isCompare = /grandTotals\[h\.id\] = \(totals\[h\.id\] \|\| 0\) \* 1\.18;/.test(out);
  const isCompareRows = COMPARE_TAX_ROWS.test(out);

  if (isVenueCopy || isPickerCopy) {
    swap("tax variables", TAX_VARS, "var grandWithGst = ViraayaTax.total(grandTotal);");
  }

  if (isPickerCopy) {
    swap(
      "subtotal row",
      ROW_TPL("Subtotal \\(Before GST\\)", "grandTotal"),
      "\n        ${ViraayaTax.rowsHtml(grandTotal, convertAndFormat)}",
    );
    swap("CGST row", ROW_TPL("CGST \\(9%\\)", "cgst"), "");
    swap("SGST row", ROW_TPL("SGST \\(9%\\)", "sgst"), "");
  }

  if (isVenueCopy) {
    swap(
      "subtotal row",
      ROW_CONCAT("Subtotal \\(Before GST\\)", "grandTotal"),
      "\nhtml += ViraayaTax.rowsHtml(grandTotal, cf);",
    );
    swap("CGST row", ROW_CONCAT("CGST \\(9%\\)", "cgst"), "");
    swap("SGST row", ROW_CONCAT("SGST \\(9%\\)", "sgst"), "");
  }

  if (isVenueCopy || isPickerCopy) {
    // Runs for both forms; the concat pass below converts the venue copy's
    // result out of template-literal syntax, which is inert inside its quotes.
    swap(
      "total note",
      /<small style="font-size:11px;color:#999;">\(incl\. GST\)<\/small>/,
      '<small style="font-size:11px;color:#999;">(${ViraayaTax.totalNote()})</small>',
    );
  }
  if (isVenueCopy) {
    swap(
      "total note (concat form)",
      /Total Estimated Cost <small style="font-size:11px;color:#999;">\(\$\{ViraayaTax\.totalNote\(\)\}\)<\/small><\/span>';/,
      "Total Estimated Cost <small style=\"font-size:11px;color:#999;\">(' + ViraayaTax.totalNote() + ')</small></span>';",
    );
  }

  if (isCompareRows) {
    swap("compare tax rows", COMPARE_TAX_ROWS, COMPARE_TAX_ROWS_REPLACEMENT);
  }

  if (isCompare) {
    swap(
      "compare multiplier",
      /grandTotals\[h\.id\] = \(totals\[h\.id\] \|\| 0\) \* 1\.18;/,
      "grandTotals[h.id] = (totals[h.id] || 0) * ViraayaTax.multiplier();",
    );
    swap(
      "compare total note",
      /<small class="d-block" style="font-size:10px;color:#94a3b8;font-weight:400;">\(incl\. 18% GST\)<\/small>/,
      '<small class="d-block" style="font-size:10px;color:#94a3b8;font-weight:400;">(${ViraayaTax.totalNote()})</small>',
    );
  }

  return { html: out, changed: out !== html, problems };
}
