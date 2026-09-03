/**
 * Turns the hotel picker on the calculators into a budget picker.
 *
 * The change the site owner asked for: a visitor gives a place, the dates, the
 * rooms and meals per day and a whole-stay budget, and the calculator answers
 * with the hotels in that place that come in under the number -- rather than
 * asking them to name a hotel they have not chosen yet.
 *
 * This is markup only, on purpose. The behaviour lives in
 * site-public/js/cost-calculator-budget.js and in /api/calculator/budget-match,
 * because the calculator's own JavaScript is inlined per page in five
 * separately drifted copies and rewriting all five is how a change to this tool
 * has always gone wrong. What each page gets here is:
 *
 *   1. the `#hotelSelect` field replaced by `#budgetSelect` (full-picker pages);
 *   2. a `#budgetSelect` added (venue pages and /compare-hotel, where the hotel
 *      is either fixed by the page or the entire point of the page, so the
 *      budget is recorded on the enquiry instead of driving a search);
 *   3. the button relabelled to say what it now does;
 *   4. the shared script tag.
 *
 * The bands themselves are NOT written into the markup: `#budgetSelect` ships
 * with its placeholder only and worker/site/calculator-inject.ts fills it from
 * `calculator_budgets` on every request, the same way `#citySelect` is filled
 * from `calculator_cities`. An option written into a page is an option no admin
 * can edit, which is the mistake this file exists to avoid repeating.
 *
 * The same markup exists in three places that must not drift, and each is
 * reached differently:
 *
 *   - site-public/ ** /*.html                  scripts/apply-calculator-budget.mjs
 *   - worker/db/page-templates.generated.ts    (same script)
 *   - page_templates / static_pages rows       scripts/migrate-stored-pages.mjs
 *
 * `transform` is idempotent and reports rather than throws, so the database
 * pass is safe to run on every deploy: it rewrites a row the first time and is
 * a no-op afterwards, and it edits the stored markup in place rather than
 * replacing the page, so an admin's own edits to those pages survive.
 */

/**
 * Pages worth looking at: anything carrying one of the three calculators.
 *
 * `#daysContainer` is what makes a page a calculator rather than a page that
 * merely looks like one. /check-hotel-availability builds `.hotel-select`
 * elements too, but it prices nothing -- it is an enquiry form in the
 * calculator's styling (see docs/AUDIT-CALCULATORS.md) -- and giving it a
 * budget field it has nothing to do with is how the look-alikes got counted as
 * calculators in the first place.
 */
export const BUDGET_MARKER = /id="hotelSelect"|id="hotelId"|id="budgetSelect"|id="daysContainer"/;

/** The shared script, and the tag that anchors it. */
export const BUDGET_SCRIPT_SRC = "/js/cost-calculator-budget.js";
const CURRENCY_SCRIPT = '<script src="/js/currency-switcher.js"></script>';

/** What must not survive on a page that has been transformed. */
export const BANNED_PATTERNS = [
  [/id="hotelSelect"/, "hotel picker still on a full-picker calculator"],
  [/<option value="70l-1cr"|<option value="1cr-2cr"/, "budget bands baked into the markup"],
  // The heading, not the section: /wedding-packages and /package build their
  // own pages out of the same wrapper and must keep it.
  [/Our Wedding\s*<span[^>]*>\s*Packages/, "the wedding packages strip is back on the home page"],
];

/**
 * The "Our Wedding Packages" strip, taken off the home page.
 *
 * Cut out of the markup rather than hidden at request time. An HTMLRewriter
 * rule would have been one line, but it fails open: the home page falls back to
 * its own file whenever the `home` shell or the database is out of reach, and a
 * section that reappears when the database is down is not hidden. A section
 * still present in the HTML is also still indexed, whatever CSS says about it.
 *
 * Only the strip on `/` goes. /wedding-packages and /package build their own
 * pages out of the same `.packages-wrapper` section, so the selector alone
 * would have emptied both -- they are told apart by the heading, which reads
 * "Our Wedding Packages" on the home page and "Wedding Packages" on the pages
 * themselves. The header and footer links are untouched too: this hides one
 * section, not the packages.
 */
// `\r?\n` because the cloned pages are a mix of CRLF and LF, and the home page
// -- the only page carrying this section -- is one of the CRLF ones.
const PACKAGES_SECTION = /\r?\n[ \t]*<section class="packages-wrapper">[\s\S]*?<\/section>/;

/** The heading that marks the home-page strip rather than a packages page. */
const HOME_STRIP_HEADING = /Our Wedding\s*<span[^>]*>\s*Packages/;

function removePackagesSection(html, problems) {
  const match = html.match(PACKAGES_SECTION);
  if (!match) {
    // Nothing to do, or already done. Only report a section that is on the page
    // in a shape this cannot reach.
    if (/<section class="packages-wrapper">/.test(html) && HOME_STRIP_HEADING.test(html)) {
      problems.push("the wedding packages strip is present but did not match");
    }
    return html;
  }
  if (!HOME_STRIP_HEADING.test(match[0])) return html;
  return html.replace(PACKAGES_SECTION, "");
}

const BUDGET_PLACEHOLDER = "Select a Budget";

function hasFullPicker(html) {
  return html.includes('id="citySelect"') && html.includes('id="hotelSelect"');
}

function hasBudgetSelect(html) {
  return html.includes('id="budgetSelect"');
}

function isVenueCalculator(html) {
  return html.includes('id="hotelId"') && html.includes('id="daysContainer"');
}

function isComparePage(html) {
  return (
    html.includes('class="form-control hotel-select"') &&
    html.includes('id="calculateCost"') &&
    html.includes('id="daysContainer"')
  );
}

/**
 * Swaps the Hotel field for a Budget field, in place.
 *
 * Matched from the label through the closing `</select>` so the surrounding
 * column, the icon and the page's own indentation are all left exactly as they
 * were -- the three copies of this widget differ in every one of those, and
 * rebuilding the block would have meant three templates instead of one edit.
 *
 * `select2-hotel` is dropped with the field: the page still calls
 * `$('.select2-hotel').select2(...)`, which becomes a no-op on an empty set.
 * The `disabled` attribute goes too -- it existed because a hotel could not be
 * chosen before a city was, and a budget has no such order.
 */
const HOTEL_FIELD = new RegExp(
  "(<label\\b[^>]*>)Hotel(</label>\\s*?\\n([ \\t]*))" +
    '<select\\b([^>]*?)\\bid="hotelSelect"([^>]*)>' +
    "[\\s\\S]*?" +
    "</select>",
);

function replaceHotelField(html, problems) {
  if (!HOTEL_FIELD.test(html)) {
    problems.push("full picker found but its hotel field did not match");
    return html;
  }

  return html.replace(HOTEL_FIELD, (whole, labelOpen, labelClose, indent, before, after) => {
    const attributes = `${before}${after}`
      .replace(/\s*\bdisabled\b/g, "")
      .replace(/\s*\bselect2-hotel\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return (
      `${labelOpen}Budget${labelClose}` +
      `<select ${attributes} id="budgetSelect">\n` +
      `${indent}    <option value="">${BUDGET_PLACEHOLDER}</option>\n` +
      `${indent}</select>`
    );
  });
}

/** The button no longer costs one hotel, so it no longer says it does. */
function relabelButton(html) {
  return html.replace(
    /(<button\b[^>]*\bid="calculateCost"[^>]*>\s*)Calculate HOTEL COST(\s*<\/button>)/,
    "$1Find Hotels In My Budget$2",
  );
}

/**
 * A budget field for the calculators that keep their own hotel.
 *
 * On a venue page the hotel is the page, and on /compare-hotel choosing hotels
 * is the whole tool -- so neither is turned into a search. Both still carry the
 * band, which reaches the team on the enquiry: that was the other half of what
 * was asked for, and it is the half that works on every calculator.
 */
function budgetRowHtml(indent, labelClass, columnClass) {
  const pad = " ".repeat(indent);
  return (
    `${pad}<div class="${columnClass}">\n` +
    `${pad}    <div class="form-group">\n` +
    `${pad}        <label class="${labelClass}">Budget</label>\n` +
    `${pad}        <select class="form-control font-family01 fs-14" id="budgetSelect">\n` +
    `${pad}            <option value="">${BUDGET_PLACEHOLDER}</option>\n` +
    `${pad}        </select>\n` +
    `${pad}    </div>\n` +
    `${pad}</div>\n`
  );
}

const VENUE_DATE_ROW = /(\r?\n([ \t]*)<div class="row gx-2 mb-3">\r?\n)/;

function addVenueBudget(html, problems) {
  if (!VENUE_DATE_ROW.test(html)) {
    problems.push("venue calculator found but its date row did not match");
    return html;
  }

  return html.replace(VENUE_DATE_ROW, (whole, opening, indent) => {
    const row = budgetRowHtml(
      indent.length + 4,
      "font-family01 fs-13 fw-500 position-absolute bg-white text-maroon-900",
      "col-12",
    );
    return `\n${indent}<div class="row gx-2 mb-3">\n${row}${indent}</div>\n${opening.replace(/^\n/, "")}`;
  });
}

/**
 * The comparison page's "Search Now" button.
 *
 * Anchored on the button's own id, not on the chrome around it. The first
 * version of this spelled out `col-md-12 mt-3` > `form-group` >
 * `<button type="button"` with exact newlines between each, and the stored
 * `/compare-hotel` row had drifted far enough from the file it was seeded from
 * that none of it matched -- which aborted the whole deploy, because a
 * reported problem writes nothing at all.
 *
 * `id="calculateCost"` is the one part of this widget every copy agrees on
 * (see docs/AUDIT-CALCULATORS.md, which notes the same id identifies the
 * button on all three calculators). `[^>]*` spans newlines, so an attribute
 * list broken across lines is fine, and `\r?\n` covers the CRLF pages.
 *
 * Two tiers: the button's own `.form-group` wrapper where there is one, and
 * the bare button where there is not.
 */
const COMPARE_BUTTON_GROUP =
  /(\r?\n)([ \t]*)(<div class="form-group">\s*<button\b[^>]*\bid="calculateCost")/;
const COMPARE_BUTTON_BARE = /(\r?\n)([ \t]*)(<button\b[^>]*\bid="calculateCost")/;

/** The budget field as a plain form-group, indented to sit with its sibling. */
function compareBudgetHtml(indent, newline) {
  return [
    `${indent}<div class="form-group">`,
    `${indent}    <label class="font-family01 fs-13 fw-500 text-maroon-900">Budget</label>`,
    `${indent}    <select class="form-control font-family01 fs-14" id="budgetSelect">`,
    `${indent}        <option value="">${BUDGET_PLACEHOLDER}</option>`,
    `${indent}    </select>`,
    `${indent}</div>`,
  ].join(newline);
}

function addCompareBudget(html, problems) {
  const pattern = COMPARE_BUTTON_GROUP.test(html)
    ? COMPARE_BUTTON_GROUP
    : COMPARE_BUTTON_BARE.test(html)
      ? COMPARE_BUTTON_BARE
      : null;

  if (!pattern) {
    problems.push("comparison calculator found but its Search Now button did not match");
    return html;
  }

  return html.replace(pattern, (whole, newline, indent, tail) => {
    const block = compareBudgetHtml(indent, newline);
    return `${newline}${block}${newline}${indent}${tail}`;
  });
}

/**
 * Loads the shared script beside the one it depends on.
 *
 * Placed after currency-switcher.js deliberately. That file installs the
 * "Price on request" guard as a capture-phase listener on `#calculateCost`;
 * registering ours second means its guard still runs first, finds no hotel
 * picker on a budget page, and stands aside -- rather than being cut off by our
 * `stopImmediatePropagation`.
 */
function addScriptTag(html, problems) {
  if (html.includes(BUDGET_SCRIPT_SRC)) return html;
  if (!html.includes(CURRENCY_SCRIPT)) {
    problems.push("no currency-switcher.js tag to anchor the budget script to");
    return html;
  }
  return html.replace(
    CURRENCY_SCRIPT,
    `${CURRENCY_SCRIPT}\n<script src="${BUDGET_SCRIPT_SRC}"></script>`,
  );
}

export function transform(html) {
  const problems = [];
  let next = removePackagesSection(html, problems);

  if (hasFullPicker(next)) {
    next = replaceHotelField(next, problems);
    next = relabelButton(next);
  } else if (isVenueCalculator(next) && !hasBudgetSelect(next)) {
    next = addVenueBudget(next, problems);
  } else if (isComparePage(next) && !hasBudgetSelect(next)) {
    next = addCompareBudget(next, problems);
  }

  // Every calculator page gets the script, including the ones already carrying
  // a budget field from an earlier run.
  if (BUDGET_MARKER.test(next)) {
    next = addScriptTag(next, problems);
  }

  return { html: next, changed: next !== html, problems };
}
