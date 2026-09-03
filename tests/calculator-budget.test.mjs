import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  BANNED_PATTERNS,
  BUDGET_MARKER,
  BUDGET_SCRIPT_SRC,
  transform,
} from "../scripts/lib/calculator-budget-transform.mjs";
import {
  fitsBand,
  hasAnyInput,
  monthFromDate,
  multiplierFor,
  normalizeDays,
  peakRooms,
  subtotalFor,
} from "../worker/site/budget-formula.ts";

/**
 * The budget picker, guarded on both sides.
 *
 * The markup half: every calculator on the site carries a budget field, none
 * still carries the hotel picker it replaced, and no page writes the bands into
 * itself -- they come from `calculator_budgets` through
 * worker/site/calculator-inject.ts, so a band an admin edits reaches all 272
 * calculator instances without a deploy.
 *
 * The maths half: what /api/calculator/budget-match does with a request body
 * before it prices anything against it.
 *
 * Files and pure functions only, so these run in CI with no database.
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
const CALCULATOR_PAGES = PAGES.filter((file) => BUDGET_MARKER.test(readFileSync(file, "utf8")));

test("every calculator page carries the budget field and the shared script", () => {
  assert.ok(CALCULATOR_PAGES.length > 200, `expected the whole calculator set, found ${CALCULATOR_PAGES.length}`);

  const missingField = CALCULATOR_PAGES.filter(
    (file) => !readFileSync(file, "utf8").includes('id="budgetSelect"'),
  );
  const missingScript = CALCULATOR_PAGES.filter(
    (file) => !readFileSync(file, "utf8").includes(BUDGET_SCRIPT_SRC),
  );

  assert.deepEqual(missingField, [], "these calculators have no budget picker");
  assert.deepEqual(missingScript, [], "these calculators do not load the budget script");
});

test("the wedding packages strip is off the home page, and only there", () => {
  const home = readFileSync("site-public/index.html", "utf8");
  assert.equal(home.includes('<section class="packages-wrapper">'), false);
  assert.equal(home.includes("Shresht"), false);
  // The links went later, when the packages area was unpublished -- see
  // tests/unpublish-packages.test.mjs. The pages themselves still exist.
  for (const page of ["site-public/wedding-packages/index.html", "site-public/package/index.html"]) {
    assert.ok(
      readFileSync(page, "utf8").includes('<section class="packages-wrapper">'),
      `${page} lost its own packages section`,
    );
  }
});

test("no page carries a hotel picker or a budget band of its own", () => {
  const offenders = [];
  for (const file of PAGES) {
    const html = readFileSync(file, "utf8");
    for (const [pattern, why] of BANNED_PATTERNS) {
      if (pattern.test(html)) offenders.push(`${file}: ${why}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the generated shells carry the same change as the files they mirror", () => {
  const source = readFileSync("worker/db/page-templates.generated.ts", "utf8");
  const shells = [...source.matchAll(/^\s*html: (".*"),$/gm)].map((match) => JSON.parse(match[1]));
  const calculators = shells.filter((html) => BUDGET_MARKER.test(html));

  assert.ok(calculators.length > 0, "no shell carries a calculator");
  for (const html of calculators) {
    assert.ok(html.includes('id="budgetSelect"'), "a shell has no budget picker");
    assert.ok(html.includes(BUDGET_SCRIPT_SRC), "a shell does not load the budget script");
    assert.ok(!html.includes('id="hotelSelect"'), "a shell still carries the hotel picker");
  }
});

test("the transform is idempotent, so the deploy pass can run on every deploy", () => {
  for (const file of CALCULATOR_PAGES.slice(0, 20)) {
    const html = readFileSync(file, "utf8");
    const result = transform(html);
    assert.deepEqual(result.problems, [], file);
    assert.equal(result.changed, false, `${file} would be rewritten again`);
  }
});

test("/check-hotel-availability is left alone: it is an enquiry form, not a calculator", () => {
  const html = readFileSync("site-public/check-hotel-availability/index.html", "utf8");
  assert.equal(BUDGET_MARKER.test(html), false);
  assert.equal(html.includes('id="budgetSelect"'), false);
});

test("the check-in month decides which rate card is read", () => {
  // flatpickr writes d-m-Y on every calculator.
  assert.equal(monthFromDate("14-11-2026"), "November");
  assert.equal(monthFromDate("01-01-2027"), "January");
  // A missing or malformed date falls back to now rather than throwing, which
  // is what the legacy endpoints have always done.
  assert.ok(monthFromDate("").length > 2);
  assert.ok(monthFromDate("nonsense").length > 2);
});

test("the day grid is re-derived from the request rather than trusted", () => {
  const days = normalizeDays([
    { rooms: "12", lunch: 200, hitea: -5, dinner: "not a number" },
    { rooms: 1.9 },
  ]);

  assert.deepEqual(days, [
    { rooms: 12, lunch: 200, hitea: 0, dinner: 0 },
    { rooms: 1, lunch: 0, hitea: 0, dinner: 0 },
  ]);

  // Not an array at all, which is what a probe sends.
  assert.deepEqual(normalizeDays("50000"), []);
  assert.deepEqual(normalizeDays(null), []);

  // A figure past any real venue is clamped, not multiplied out.
  assert.equal(normalizeDays([{ rooms: 10 ** 12 }])[0].rooms, 100_000);
});

test("an empty grid is refused before anything is priced", () => {
  assert.equal(hasAnyInput([]), false);
  assert.equal(hasAnyInput([{ rooms: 0, lunch: 0, hitea: 0, dinner: 0 }]), false);
  assert.equal(hasAnyInput([{ rooms: 0, lunch: 0, hitea: 0, dinner: 0 }, { rooms: 2 }]), true);
});

test("the cost formula is the one the calculators have always used", () => {
  const rates = {
    room_price: "20000.00",
    lunch_price: "4000.00",
    hitea_price: "1200.00",
    dinner_price: "5000.00",
  };
  const days = [
    { rooms: 100, lunch: 300, hitea: 300, dinner: 300 },
    { rooms: 100, lunch: 0, hitea: 0, dinner: 300 },
  ];

  // Day 1: 100x20000 + 300x(4000 + 1200 + 5000) = 2,000,000 + 3,060,000
  // Day 2: 100x20000 + 300x5000                 = 2,000,000 + 1,500,000
  assert.equal(subtotalFor(days, rates), 8_560_000);

  // Unpriced hotels read as zero here and are filtered out by matchBudget,
  // rather than quoting a wedding at nothing.
  assert.equal(subtotalFor(days, undefined), 0);
  assert.equal(
    subtotalFor(days, { room_price: "0.00", lunch_price: "0.00", hitea_price: "0.00", dinner_price: "0.00" }),
    0,
  );
});

test("tax comes from the published lines, never a hardcoded 18%", () => {
  assert.equal(multiplierFor([{ percent: 9 }, { percent: 9 }]), 1.18);
  // An admin who unpublishes both gets a subtotal, not a silent 18%.
  assert.equal(multiplierFor([]), 1);
  assert.equal(multiplierFor([{ percent: 18 }]), 1.18);
});

test("a band includes both its ends, and an open-ended band has no ceiling", () => {
  const band = { min: 7_000_000, max: 10_000_000 };
  assert.equal(fitsBand(6_999_999, band), false);
  assert.equal(fitsBand(7_000_000, band), true);
  assert.equal(fitsBand(10_000_000, band), true);
  assert.equal(fitsBand(10_000_001, band), false);

  // The top band an admin can add: "5 Cr and above", stored with no ceiling.
  assert.equal(fitsBand(10 ** 12, { min: 50_000_000, max: null }), true);

  // No band picked is not a band that matches nothing.
  assert.equal(fitsBand(1, null), true);
});

test("capacity is judged on the busiest single day, not the total", () => {
  // Three days of 60 rooms is a 60-room stay, not a 180-room one.
  assert.equal(peakRooms([{ rooms: 60 }, { rooms: 60 }, { rooms: 60 }]), 60);
  assert.equal(peakRooms([{ rooms: 20 }, { rooms: 85 }]), 85);
  assert.equal(peakRooms([]), 0);
});

test("the shared script reads every grid shape the calculators actually render", () => {
  // Two shapes exist. The full picker and the venue pages render `.day-section`
  // rows with `.rooms-input` and friends; /compare-hotel renders `.day-block`
  // rows named `days[1][rooms]` with no classes at all. Reading only the first
  // is why the comparison enquiry went out with an empty rooms-and-meals line,
  // and nothing failed -- the field was simply blank.
  const script = readFileSync("site-public/js/cost-calculator-budget.js", "utf8");

  const shapes = [
    { token: ".day-section", pages: ["site-public/hotel-cost-calculator/index.html"] },
    { token: ".rooms-input", pages: ["site-public/hotel-cost-calculator/index.html"] },
    { token: ".day-block", pages: ["site-public/compare-hotel/index.html"] },
    { token: "[rooms]", pages: ["site-public/compare-hotel/index.html"] },
  ];

  for (const { token, pages } of shapes) {
    const bare = token.replace(/^\./, "");
    for (const page of pages) {
      assert.ok(
        readFileSync(page, "utf8").includes(bare),
        `${page} no longer renders ${token}; the shared script still looks for it`,
      );
    }
    assert.ok(script.includes(bare), `the shared script does not read ${token}`);
  }
});

/**
 * The stored rows are not the files.
 *
 * `/compare-hotel`'s row in `static_pages` had drifted from the file it was
 * seeded from, and the first version of the comparison matcher -- which spelled
 * out the column, the form-group and `<button type="button"` with exact
 * newlines between them -- missed it. Because a reported problem writes
 * nothing at all, that one page aborted the entire production deploy.
 *
 * These feed the shapes a stored row can plausibly have through the transform.
 * None of them may report a problem, and every one must come out with a budget
 * field.
 */
const COMPARE_SHAPES = {
  "as the file has it": `<div class="col-md-12 mt-3">
    <div class="form-group">
        <button type="button"
            class="btn w-100"
            id="calculateCost">
            Search Now
        </button>
    </div>
</div>`,

  "CRLF line endings": `<div class="col-md-12 mt-3">\r\n    <div class="form-group">\r\n        <button type="button" id="calculateCost">Search Now</button>\r\n    </div>\r\n</div>`,

  "attributes on one line, different column class": `<div class="col-12">
    <div class="form-group">
        <button type="button" class="btn" id="calculateCost">Search Now</button>
    </div>
</div>`,

  "no form-group wrapper at all": `<div class="col-md-12 mt-3">
    <button type="button" id="calculateCost">Search Now</button>
</div>`,

  "attribute order reversed": `<div class="form-group">
    <button id="calculateCost" type="button" class="btn">Search Now</button>
</div>`,
};

test("the comparison budget field survives a stored row that has drifted", () => {
  for (const [shape, markup] of Object.entries(COMPARE_SHAPES)) {
    // Enough context for the transform to recognise a comparison page.
    const page = `<html><head></head><body>
<div id="daysContainer"></div>
<select class="form-control hotel-select" data-index="1"><option value="">Select Hotel</option></select>
${markup}
<script src="/js/currency-switcher.js"></script>
</body></html>`;

    const result = transform(page);
    assert.deepEqual(result.problems, [], `${shape}: reported a problem, which aborts the whole deploy`);
    assert.ok(result.html.includes('id="budgetSelect"'), `${shape}: no budget field was added`);
    // The button is still there and still the page's own.
    assert.ok(result.html.includes('id="calculateCost"'), `${shape}: lost the Search Now button`);
    // And a second pass is a no-op, so the deploy can run this every time.
    assert.equal(transform(result.html).changed, false, `${shape}: not idempotent`);
  }
});

test("the venue budget field survives CRLF, which the first pattern did not", () => {
  const page = [
    "<html><head></head><body>",
    '<input type="hidden" id="hotelId" value="22">',
    '<div class="row gx-2 mb-3">',
    '    <div class="col-md-6"><input id="checkIn"></div>',
    "</div>",
    '<div id="daysContainer"></div>',
    '<script src="/js/currency-switcher.js"></script>',
    "</body></html>",
  ].join("\r\n");

  const result = transform(page);
  assert.deepEqual(result.problems, []);
  assert.ok(result.html.includes('id="budgetSelect"'), "CRLF venue page got no budget field");
  assert.equal(transform(result.html).changed, false, "not idempotent");
});
