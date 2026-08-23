# Calculator audit

Audit date: 2026-08-23. Scope: every `.html` page under `site-public/` (the
shells that `static_pages` / `page_templates` are seeded from, so this is also
what the live database-rendered site serves), plus the routes, worker modules
and admin screens behind them.

## Headline numbers

| Measure | Count |
| --- | --- |
| **Unique calculators** (distinct tools a visitor can use) | **3** |
| **Distinct code copies** of those 3 tools | **5** |
| **Total calculator instances** placed across the site | **272** |
| **Pages carrying at least one calculator** | **272** |
| Public HTML pages in the site | 368 |
| Share of pages with a calculator | ~74% |

Every page that has a calculator has exactly one, so instances and pages match.

All three tools price the same thing — hotel/venue cost for a wedding stay —
off the same dataset. There is no second family of calculator (no budget,
guest-list, per-plate or savings calculator anywhere in the codebase).

---

## The 3 unique calculators

### 1. Hotel Cost Calculator — full picker

**12 pages.** City → hotel → check-in/check-out → a per-day grid of rooms,
lunch pax, hi-tea pax, dinner pax → cost summary in an offcanvas panel.

Pages:

| Path | Heading |
| --- | --- |
| `/` | Wedding Venue Cost Calculator |
| `/hotel-cost-calculator` | Cost Calculator |
| `/destination-wedding-in-agra` | Cost Calculator |
| `/destination-wedding-in-dehradun` | Cost Calculator |
| `/destination-wedding-in-delhi` | Cost Calculator |
| `/destination-wedding-in-goa` | Cost Calculator |
| `/destination-wedding-in-jaipur` | Cost Calculator |
| `/destination-wedding-in-jim-corbett` | Cost Calculator |
| `/destination-wedding-in-jodhpur` | Cost Calculator |
| `/destination-wedding-in-mussoorie` | Cost Calculator |
| `/destination-wedding-in-rishikesh` | Cost Calculator |
| `/destination-wedding-in-udaipur` | Cost Calculator |

The 10 `destination-wedding-in-<city>` pages are *not* pre-filtered to their
city — each ships the full 53-city dropdown.

Markup anchor: `<div class="cost-calculator-widget">` containing
`#citySelect`, `#hotelSelect`, `#checkIn`, `#checkOut`, `#daysContainer`,
`#calculateCost`.

### 2. Hotel Cost Calculator — venue-page variant

**259 pages** — every hotel detail page under
`/destination-wedding/<city>/<hotel>`. Coverage is complete: 259 of 259 hotel
pages carry it, none are missing it.

Same per-day grid and same summary, but the hotel is fixed by the page:

```html
<input type="hidden" id="hotelId" value="168">
<input type="hidden" id="hotelTotalRooms" value="189">
```

`#hotelTotalRooms` is enforced client-side — a rooms input above the hotel's
capacity is clamped, and submitting an over-capacity day is blocked with an
alert. The full picker (calculator 1) has no such cap.

Markup anchor: `<div class="estimator-wrapper listing-details-calculator">`
wrapping a `cost-calculator-widget`.

### 3. Hotel Cost Comparison Calculator

**1 page:** [`/compare-hotel`](site-public/compare-hotel/index.html).

City tabs → multi-select hotels → check-in/check-out → per-day rooms and meal
pax → a side-by-side comparison table with a subtotal, GST and grand total per
hotel, and the cheapest column highlighted. Per-hotel room capacity is
enforced here too (`error: 'exceeded'`), and a hotel with no rate for the month
renders as `no_price` rather than as zero.

Its button carries the same `#calculateCost` id but is labelled **Search Now**
and sits outside the `cost-calculator-widget` shell — which is why a plain
class-name grep undercounts the site by one.

---

## Shared cost formula

Calculators 1 and 2 are byte-identical in their maths; calculator 3 differs
only in how it presents GST.

```
dayTotal   = rooms  × room_price
           + lunch  × lunch_price
           + hitea  × hitea_price
           + dinner × dinner_price

subtotal   = Σ dayTotal over the stay
CGST       = subtotal × 0.09
SGST       = subtotal × 0.09
grandTotal = subtotal × 1.18
```

Rates are per-hotel **per calendar month**, resolved from the check-in month's
English long name (`January` … `December`). Totals are passed through
`convertAndFormat()` from `currency-switcher.js`, which applies the visitor's
selected currency and Indian digit grouping.

`/compare-hotel` applies the same `× 1.18` in one step rather than showing CGST
and SGST as separate lines.

---

## 5 code copies of 3 tools

The calculator JavaScript is inlined per page, not shared from a bundle. There
are five distinct copies:

| # | Copy | Pages | Script size (normalised) |
| --- | --- | --- | --- |
| A1 | Home page picker | 1 | ~17.1 KB |
| A2 | `/hotel-cost-calculator` picker | 1 | ~14.5 KB |
| A3 | `destination-wedding-in-*` picker | 10 (identical) | ~12.3 KB |
| B | Venue-page calculator | 259 (identical) | ~9 KB |
| C | `/compare-hotel` comparison | 1 | ~14.3 KB |

A1, A2 and A3 are the same calculator with three separately-drifted
implementations — same widgets, same formula, same libraries (select2,
flatpickr, offcanvas, `convertAndFormat`), different wiring. **A fix to the
cost logic has to be made in five places.** The 259 venue pages and the 10
landing pages are at least internally identical, so it is five edits, not 272.

---

## Data behind the calculators

One dataset feeds all three. Live rows come from Postgres
(`calculator_cities`, `calculator_hotels`, `calculator_prices`,
`calculator_currencies`); the bundled copy in
[worker/calculator-data.ts](worker/calculator-data.ts) is the fallback when the
database is unseeded or unreachable, so an empty database never prices a
calculator at zero.

Current size:

| Table | Rows |
| --- | --- |
| Cities | 53 (all 53 have hotels) |
| Hotels | 259 |
| Hotels with a price row | 259 |
| Price cells (hotel × month) | 3,108 |
| Currencies | 1 (INR, default, `rate_to_usd` 94.15) |

### Endpoints

| Route | Used by |
| --- | --- |
| `GET /api/calculator/data` | whole dataset in one response — [app/api/calculator/data/route.ts](app/api/calculator/data/route.ts) |
| `GET /data/calculator/{cities,hotels,hotels-by-city,prices,currencies}.json` | home + `/hotel-cost-calculator` inline loaders — [app/data/calculator/[file]/route.ts](app/data/calculator/%5Bfile%5D/route.ts) |
| `GET /get-cities?search=` | `/compare-hotel` select2 |
| `GET /get-hotels-by-city/<cityId>` | pickers on calculators 1 and 3 |
| `GET /get-hotel-price/<hotelId>/<Month>` | calculators 1 and 2 |
| `POST /get-hotel-prices` | `/compare-hotel` (form-encoded `hotel_ids[]` + `checkin`) |

The four legacy `/get-*` paths are PHP-era shapes the cloned pages still call
verbatim; they are re-implemented in
[worker/site/legacy-calculator-endpoints.ts](worker/site/legacy-calculator-endpoints.ts)
against the same database rows. `currency-switcher.js` also installs a
`fetch`/`$.ajax` interceptor (`ViraayaCalculatorData`) that can answer those
same paths client-side from the cached dataset.

### Admin

Prices are editable at `/admin/calculator` (cities, currencies) and
`/admin/calculator/hotels[/<id>]` (per-hotel monthly rates) —
[app/admin/calculator/page.tsx](app/admin/calculator/page.tsx),
[actions.ts](app/admin/calculator/actions.ts). Edits reach every one of the 272
instances, because all five code copies read the same routes.

---

## Look-alikes that are *not* calculators

These reuse the `cost-calculator-widget` shell and inflate any naive grep:

| Thing | Instances | What it is |
| --- | --- | --- |
| "Check hotel availability" CTA card | 259 (one per venue page) | a styled link to `/check-hotel-availability` |
| "Request a callback" lead form | 54 (53 city index pages + `/hotel-listing`) | a `POST /api/lead` form in the calculator's card styling |
| `.cost-calculator-widget` CSS rules | ~8 per page | stylesheet selectors, not markup |

Also adjacent but distinct:

- **`/check-hotel-availability` — "Availability Checker".** Dates (preferred
  plus two alternates), rooms/pax, a 1/3/5-hotel plan, hotel picks, then an
  enquiry submission. Its `#price-summary-box` shows guidance copy only, and
  every plan option carries `data-amount="0"`. It computes nothing — it is a
  request form, not a calculator.
- **`/appointment-booking`** — slot picker and payment handoff, no cost maths.
- **Currency switcher** — converts already-computed totals; not a calculator in
  its own right, though every calculator depends on it for formatting.

### Entry points

Links to the calculators appear far more widely than the calculators
themselves — 367 pages link to `/hotel-cost-calculator`, 272 to
`/compare-hotel`, 367 to `/check-hotel-availability` (header and footer
navigation). Counting links rather than widgets is the other common way to
overcount.

---

## Findings worth acting on

> **Resolved.** Every finding below was fixed on 2026-08-23. What replaced it,
> and what keeps it fixed, is in
> [AUDIT-PAGE-DATA-SOURCES.md](AUDIT-PAGE-DATA-SOURCES.md). The
> counts and the anatomy above still describe the site; the code samples show
> the markup as it was before that change.


1. **Five copies of one calculator.** A1/A2/A3 are the same tool implemented
   three times, and B is a fourth near-copy. Any change to the formula, the GST
   rate, or the summary layout must land in five files or the pages will
   disagree with each other. Extracting one script (as
   `currency-switcher.js` already is) would collapse this.
2. **GST is hardcoded at 9% + 9%** in every copy, and as `× 1.18` in a fifth.
   It is not admin-editable and not in the database, unlike every price it is
   applied to.
3. **`#calculateCost` is not a stable selector.** It identifies calculator 1's
   button, calculator 2's button, and calculator 3's "Search Now" button.
   Anything keying off it (tests, analytics, the render-diff harness) should
   also check for `#citySelect` / `#hotelId` to tell the three apart.
4. **Room capacity is enforced on 260 of 272 instances.** Calculators 2 and 3
   clamp against `total_rooms`; the 12 full-picker instances do not, so the
   home page will happily quote 500 rooms at a 189-room hotel.
5. **`app/api/calculator/availability-data/` is an empty directory** with no
   `route.ts`. Dead scaffolding — safe to delete.
6. **Only one currency is seeded** (INR). The switcher, the conversion helper
   and `rate_to_usd` are all wired up across all 272 instances, but there is
   nothing to switch to.
