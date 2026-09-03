import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import "../worker/html-rewriter.ts";
import { applyCalculatorHandlers } from "../worker/site/calculator-inject.ts";

/**
 * Every calculator, rendered through the real injection pipeline.
 *
 * The other calculator tests read markup and assert what is *not* in it. This
 * one asserts what a visitor actually receives: it runs the same
 * `applyCalculatorHandlers` the request path runs, over the real page files and
 * the real stored shells, and checks the city list, the budget bands, the tax
 * rates and the currency list all arrive.
 *
 * That is the failure this cannot otherwise catch. Injection is the only thing
 * putting data into these pages -- the markup deliberately ships empty -- so a
 * selector that stops matching does not break a test, it silently serves an
 * empty dropdown. It happened once already: `#citySelect` shipped 53 literal
 * options, adding a city in the panel changed the prices behind it but never
 * the dropdown, and nothing failed.
 *
 * No database: the config is built here in the shape `loadCalculatorConfig`
 * returns, so this runs in CI like the rest.
 */

const CITIES = [
  { id: 4, name: "Delhi NCR" },
  { id: 7, name: "Goa" },
  { id: 12, name: "Udaipur" },
];
const BUDGETS = [
  { code: "70l-1cr", label: "₹70 Lakh - ₹1 Crore", min: 7_000_000, max: 10_000_000 },
  { code: "1cr-2cr", label: "₹1 Crore - ₹2 Crore", min: 10_000_000, max: 20_000_000 },
  { code: "2cr-4cr", label: "₹2 Crore - ₹4 Crore", min: 20_000_000, max: 40_000_000 },
  { code: "4cr-5cr", label: "₹4 Crore - ₹5 Crore", min: 40_000_000, max: null },
];
const TAXES = [
  { code: "cgst", label: "CGST", percent: 9 },
  { code: "sgst", label: "SGST", percent: 9 },
];
const CURRENCIES = [
  { name: "Indian Rupee", code: "INR", symbol: "₹", rate_to_usd: 94.15, is_default: true },
];

const CONFIG = {
  cities: CITIES,
  budgets: BUDGETS,
  taxes: TAXES,
  currencies: CURRENCIES,
  hotels: [],
  hotelsByCity: {},
  roomsByHotel: {},
  cityByHotel: {},
  loaded: true,
};

async function render(html, config = CONFIG) {
  const rewriter = new HTMLRewriter();
  applyCalculatorHandlers(rewriter, config);
  return await rewriter.transform(new Response(html)).text();
}

function optionsIn(html, id) {
  const select = html.match(new RegExp(`<select[^>]*id="${id}"[\\s\\S]*?</select>`));
  if (!select) return null;
  return [...select[0].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)</g)].map((m) => ({
    value: m[1],
    text: m[2].trim(),
  }));
}

function configBlock(html) {
  const match = html.match(/<script type="application\/json" id="viraaya-calculator-config">([\s\S]*?)<\/script>/);
  if (!match) return null;
  // The injector escapes `<` so a city named with a stray tag cannot close the block.
  return JSON.parse(match[1].replace(/\\u003c/g, "<"));
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

/** One representative of each of the three tools, plus every stored shell. */
const FILES = [
  ["/", "site-public/index.html"],
  ["/hotel-cost-calculator", "site-public/hotel-cost-calculator/index.html"],
  ["/destination-wedding-in-goa", "site-public/destination-wedding-in-goa/index.html"],
  ["/compare-hotel", "site-public/compare-hotel/index.html"],
  ["a venue page", "site-public/destination-wedding/goa/caravela-beach-resort/index.html"],
];

const SHELLS = [...readFileSync("worker/db/page-templates.generated.ts", "utf8")
  .matchAll(/^\s*key: "([^"]+)",\n\s*kind: "[^"]+",\n\s*html: (".*"),$/gm)]
  .map((match) => ({ key: match[1], html: JSON.parse(match[2]) }))
  .filter((shell) => shell.html.includes('id="daysContainer"'));

const DOCUMENTS = [
  ...FILES.map(([label, path]) => ({ label, html: readFileSync(path, "utf8") })),
  ...SHELLS.map((shell) => ({ label: `shell ${shell.key}`, html: shell.html })),
];

test("every calculator page type receives its data", async () => {
  assert.ok(SHELLS.length >= 7, `expected the home and venue shells, found ${SHELLS.length}`);

  for (const { label, html } of DOCUMENTS) {
    const out = await render(html);

    const budgets = optionsIn(out, "budgetSelect");
    assert.ok(budgets, `${label}: no #budgetSelect`);
    assert.deepEqual(
      budgets.map((option) => option.text),
      ["Select a Budget", ...BUDGETS.map((band) => band.label)],
      `${label}: budget picker`,
    );

    // Only the full picker has a place field; the venue pages fix the hotel and
    // the comparison page uses per-column city selects.
    if (html.includes('id="citySelect"')) {
      const cities = optionsIn(out, "citySelect");
      assert.deepEqual(
        cities.map((option) => option.text),
        ["Select a City", ...CITIES.map((city) => city.name)],
        `${label}: city picker`,
      );
    }

    const config = configBlock(out);
    assert.ok(config, `${label}: no config block`);
    assert.equal(config.loaded, true, `${label}: config not marked loaded`);
    assert.deepEqual(config.cities, CITIES, `${label}: config cities`);
    assert.deepEqual(config.budgets, BUDGETS, `${label}: config budgets`);
    assert.deepEqual(config.taxes, TAXES, `${label}: config taxes`);
    assert.deepEqual(config.currencies, CURRENCIES, `${label}: config currencies`);

    // The shells carry a second, invalid <head> lower down; the injector guards
    // against appending to both, and a duplicate config would be parsed twice.
    assert.equal(
      (out.match(/id="viraaya-calculator-config"/g) || []).length,
      1,
      `${label}: config injected more than once`,
    );
    assert.ok(out.includes("window.ViraayaTax=window.ViraayaTax"), `${label}: tax safety net missing`);
  }
});

test("an unreadable database empties the pickers rather than serving stale ones", async () => {
  const html = readFileSync("site-public/hotel-cost-calculator/index.html", "utf8");
  const out = await render(html, { ...CONFIG, cities: [], budgets: [], loaded: false });

  // The markup's own placeholder, and nothing else. No quote is better than a
  // confident wrong one, and an empty dropdown is a fault someone reports.
  assert.deepEqual(optionsIn(out, "citySelect").map((o) => o.text), ["Select a City"]);
  assert.deepEqual(optionsIn(out, "budgetSelect").map((o) => o.text), ["Select a Budget"]);

  // The safety net still ships, so the page renders a subtotal instead of
  // throwing on the first click.
  assert.ok(out.includes("window.ViraayaTax=window.ViraayaTax"));
  assert.equal(configBlock(out).loaded, false);
});

test("a city or band named with markup cannot break out of the config block", async () => {
  const hostile = {
    ...CONFIG,
    cities: [{ id: 1, name: '</script><img src=x onerror=alert(1)>' }],
    budgets: [{ code: "x", label: '"><script>alert(1)</script>', min: 0, max: null }],
  };
  const out = await render(readFileSync("site-public/hotel-cost-calculator/index.html", "utf8"), hostile);

  assert.ok(!out.includes("<img src=x onerror"), "a city name closed the config block");
  assert.ok(!out.includes("<script>alert(1)</script>"), "a band label injected a script");
  // The value still round-trips intact to the page that reads it.
  assert.equal(configBlock(out).cities[0].name, '</script><img src=x onerror=alert(1)>');
  assert.deepEqual(
    optionsIn(out, "budgetSelect").map((o) => o.value),
    ["", "x"],
  );
});

test("no calculator page ships a rate, a city or a band of its own", () => {
  // The injection above is the only source. Anything a page carries itself is a
  // second one that an admin edit cannot reach.
  const baked = [
    [/<select[^>]*\bid="citySelect"[^>]*>\s*(?:<option value="">[^<]*<\/option>\s*)?<option value="\d/, "city list"],
    [/<select[^>]*\bid="budgetSelect"[^>]*>\s*(?:<option value="">[^<]*<\/option>\s*)?<option value="[^"]+"/, "budget bands"],
    [/\b0\.09\b/, "9% tax rate"],
    [/CGST \(9%\)|SGST \(9%\)/, "tax labels"],
    [/\*\s*1\.18\b/, "18% multiplier"],
    [/indiaCityIds/, "city allowlist"],
  ];

  const offenders = [];
  const documents = [
    ...walk("site-public").map((path) => ({ label: path, html: readFileSync(path, "utf8") })),
    ...SHELLS.map((shell) => ({ label: `shell ${shell.key}`, html: shell.html })),
  ];

  for (const { label, html } of documents) {
    for (const [pattern, what] of baked) {
      if (pattern.test(html)) offenders.push(`${label}: ${what}`);
    }
  }
  assert.deepEqual(offenders, []);
});
