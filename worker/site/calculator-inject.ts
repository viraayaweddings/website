/**
 * Puts the calculator's own data into the page at request time.
 *
 * Two things on the cloned pages were markup rather than data, and neither
 * could be reached from the admin panel:
 *
 *  - `#citySelect` shipped all 53 cities as literal <option> rows on the 12
 *    pages that carry the full picker. Adding a city in the panel changed the
 *    hotel lists and the prices behind it but never the dropdown, so the city
 *    simply did not exist for a visitor. The options are rebuilt here from
 *    `calculator_cities`.
 *  - the tax rates were written into five inline scripts. They now arrive as
 *    `window.__VIRAAYA_CALC__.taxes` and are rendered by the shared
 *    `ViraayaTax` helper in currency-switcher.js.
 *
 * Both run on every page: the selectors simply do not match on a page with no
 * calculator, and the config block is small enough that carrying it everywhere
 * is cheaper than deciding per path which pages need it -- a decision that
 * would silently rot the first time a calculator was added to a new page.
 */
import type { CalculatorConfig } from "./calculator-store";
import { escapeHtml } from "./escape";

/** Matches the placeholder the cloned pages already carried. */
const CITY_PLACEHOLDER = "Select a City";

function cityOptionsHtml(config: CalculatorConfig): string {
  const options = config.cities
    .map((city) => `<option value="${escapeHtml(String(city.id))}">${escapeHtml(city.name)}</option>`)
    .join("");
  return `<option value="">${CITY_PLACEHOLDER}</option>${options}`;
}

/**
 * The config block the page scripts read.
 *
 * Serialised with JSON.stringify and with `<` escaped: a city named with a
 * stray "</script>" would otherwise close the block and put markup on the page.
 *
 * The data lives in a `type="application/json"` block rather than an
 * executing `window.__VIRAAYA_CALC__=...` assignment. CSP's `script-src`
 * governs code, not data -- a `text/javascript` block carrying this same JSON
 * would need every admin-edited combination of cities/taxes/currencies
 * individually allow-listed by hash, which defeats hash-based CSP entirely.
 * Marking it as data instead of code means it needs no hash at all;
 * currency-switcher.js reads it with `JSON.parse(el.textContent)`.
 * `TAX_SAFETY_NET` stays a real, executing script -- its content never
 * changes, so it hashes once and stays valid.
 */
function configScript(config: CalculatorConfig): string {
  const payload = {
    cities: config.cities,
    taxes: config.taxes,
    currencies: config.currencies,
    loaded: config.loaded,
  };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return (
    `<script type="application/json" id="viraaya-calculator-config">${json}</script>` +
    `<script id="viraaya-calculator-tax-safety-net">${TAX_SAFETY_NET}</script>`
  );
}

/**
 * A `ViraayaTax` that does no harm, installed before anything else runs.
 *
 * The five calculator scripts call into `ViraayaTax` instead of carrying their
 * own 9%. The real implementation is in currency-switcher.js, which overwrites
 * this unconditionally when it loads. If that file never arrives -- blocked,
 * cached badly, a network fault -- the calculators would otherwise throw on the
 * first click and render no summary at all, where before they rendered one with
 * a hardcoded rate.
 *
 * This is the honest version of that fallback: the subtotal, with the tax left
 * to the quote. It never invents a rate, because a rate with no visible source
 * is the thing being removed.
 */
const TAX_SAFETY_NET = [
  "window.ViraayaTax=window.ViraayaTax||{",
  "available:function(){return false;},",
  "lines:function(){return [];},",
  "multiplier:function(){return 1;},",
  "total:function(s){return Number(s)||0;},",
  "totalPercent:function(){return 0;},",
  "totalNote:function(){return 'taxes confirmed with your quote';},",
  'rowsHtml:function(s,f){return \'<div class="d-flex justify-content-between mb-1" style="font-size:13px;color:#666;">\'',
  "+'<span>Subtotal</span><span class=\"fw-600 text-dark\">'+f(s)+'</span></div>';}",
  "};",
].join("");

/**
 * Registers the calculator handlers.
 *
 * The stored pages no longer carry a city list of their own -- only the
 * placeholder -- so this is the sole source. An unreadable database therefore
 * shows an empty picker rather than a stale one, which is the same trade the
 * prices make: no quote beats a confident wrong quote, and an empty dropdown
 * is a fault someone will report.
 */
export function applyCalculatorHandlers(rewriter: HTMLRewriter, config: CalculatorConfig): void {
  if (config.loaded && config.cities.length > 0) {
    rewriter.on("#citySelect", {
      element(element) {
        element.setInnerContent(cityOptionsHtml(config), { html: true });
      },
    });
  }

  // Always, including when the load failed: the block carries the safety net
  // the page scripts need to render a summary at all.
  //
  // Guarded to fire once: a handful of shells carry a second, invalid `<head>`
  // tag lower in the body (see the comment on appendJsonLd in json-ld.ts for
  // why), and HTMLRewriter matches it just like the real one.
  let appended = false;
  rewriter.on("head", {
    element(element) {
      if (appended) return;
      appended = true;
      element.append(configScript(config), { html: true });
    },
  });
}
