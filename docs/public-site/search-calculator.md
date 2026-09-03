# Public Website — Search & Calculator

Discovery and pricing tools on the public site.

---

## Search

### Header Hotel Search

| | |
| --- | --- |
| **UI** | `#searchbox` overlay on all pages |
| **Script** | `site-public/js/site-search.js` |
| **API** | `GET /hotel-search?q={term}` |
| **Handler** | `worker/public-endpoints.ts` → `calculator-data.searchIndex` |
| **Results** | Max 8 hotel name matches |
| **Fallback** | Client filter on `/data/hotel-listing-data.json` |
| **Auth** | None |

### City Autocomplete (Calculator)

| | |
| --- | --- |
| **API** | `GET /get-cities?search={term}` |
| **Auth** | Same-origin required |
| **Data** | Postgres calculator tables, edited at `/admin/calculator` (India cities only) |
| **Fallback** | `currency-switcher.js` → static JSON |

---

## Calculator Data Architecture

| Source | Location | Updates require |
| --- | --- | --- |
| Postgres | `calculator_*` tables | Admin panel, live within a minute |
| Bundled table | `worker/calculator-data.ts` | Seed and fallback only |

### The `.json` paths are routes, not files

`site-public/data/calculator/` **no longer exists.** Those files were deleted:
a `vite.config.ts` rewrite already put the handler in front of them, so they were
dead weight — and a second copy of the price table on disk is precisely the thing
an admin edit cannot reach, so a misconfigured rewrite could have shipped stale
prices.

`app/data/calculator/[file]/route.ts` answers all seven names from
`loadCalculatorDataset()`. The names were kept because the homepage and
`/hotel-cost-calculator` each carry their own inline loader that fetches these
paths directly rather than going through `currency-switcher.js` — so serving the
old paths from the database means every page gets edited prices whichever route
it takes, with no page edits.

| Endpoint | Auth | Served from |
| --- | --- | --- |
| `/data/calculator/cities.json` | None | `calculator_cities` |
| `/data/calculator/hotels.json` | None | `calculator_hotels` |
| `/data/calculator/hotels-by-city.json` | None | The same, grouped by city |
| `/data/calculator/prices.json` | None | `calculator_prices` |
| `/data/calculator/currencies.json` | None | `calculator_currencies` |
| `/data/calculator/taxes.json` | None | `calculator_taxes` |
| `/data/calculator/budgets.json` | None | `calculator_budgets` |

Any other filename is a 404 — the list is a closed allowlist, so the path
segment cannot be used to reach anything else.
| `/get-cities` | Same-origin | Autocomplete |
| `/get-hotels-by-city` | Same-origin | Hotels for city |
| `/get-hotels-by-city/:cityId` | Same-origin | By ID |
| `/get-hotel-price/:id/:month` | Same-origin | Single hotel/month |
| `POST /get-hotel-prices` | Same-origin | Batch lookup |
| `POST /api/calculator/budget-match` | Same-origin | Hotels in a city that fit a band |

**Blocked (404):** `/data/calculator/calculator-data.json`, `/data/calculator/availability-data.json`

---

## Calculator Tools by Page

### 1. Hotel Cost Calculator (`/hotel-cost-calculator/`, the home page, the ten `destination-wedding-in-*` pages)

| | |
| --- | --- |
| **Purpose** | Find the hotels in a place that fit a whole-stay budget |
| **UI** | Place → check-in → check-out → budget → per-day rooms/lunch/hi-tea/dinner |
| **API** | `POST /api/calculator/budget-match` |
| **Output** | Hotels in that place, cheapest first, split into within/outside the band |
| **Lead capture** | An enquiry form in the results panel, posted through lead-forms.js |

There is **no hotel picker** on these pages. It was replaced by the budget
picker: a visitor is not expected to have chosen a venue before asking what a
venue costs. The bands come from `calculator_budgets` through
`worker/site/calculator-inject.ts`, the same way the city list does.

The behaviour is in `site-public/js/cost-calculator-budget.js`, shared by every
calculator, and it takes over the page's own inline script through two hooks
only — a `#citySelect` change (to un-gate the dates, which the removed hotel
picker used to do) and a capture-phase `#calculateCost` click. Everything else
on those pages is still their own code.

### 2. Compare Hotels (`/compare-hotel/`)

| | |
| --- | --- |
| **Purpose** | Side-by-side price comparison (up to 5 hotels) |
| **APIs** | `/get-hotels-by-city`, POST `/get-hotel-prices` |
| **Output** | Comparison table with currency formatting |
| **Budget** | Recorded, not used to search — picking hotels is the point of this page |
| **Lead capture** | An enquiry form appended under the result table, carrying the band, the dates and the hotels compared |

The page carried no form at all before this, so a budget picked on it had
nowhere to go. The comparison itself is untouched.

### 3. Venue Page Calculator (~259 pages)

| | |
| --- | --- |
| **Purpose** | Per-venue cost estimate with date picker |
| **API** | `GET /get-hotel-price/{external_hotel_id}/{month}` |
| **Hotel ID** | From `hotels.external_hotel_id` (admin-managed or static HTML) |
| **UI** | Budget + inline flatpickr + day sections + offcanvas breakdown |
| **Budget** | Recorded on every enquiry form on the page; the hotel is fixed by the page, so it does not search |

### 4. Hotel Listing Filter (`/hotel-listing/`, city pages)

| | |
| --- | --- |
| **Purpose** | Filter/browse venues |
| **Data** | `/data/hotel-listing-data.json` + injected CMS cards |
| **Behavior** | Client-side filter, not server search |

---

## Listing Data Files

| File | Purpose |
| --- | --- |
| `/data/hotel-listing-data.json` | Full venue metadata for the client filter and the search fallback. **A route, not a file** — `app/data/hotel-listing-data.json/route.ts` builds it from the database; there is no `site-public/data/` directory |
| `/data/calculator/*.json` | The seven calculator payloads, served from the database by `app/data/calculator/[file]/route.ts`. The files that used to sit under `site-public/data/calculator/` were deleted |

---

## Currency

| | |
| --- | --- |
| **Supported** | INR only |
| **Switcher** | `currency-switcher.js` — display formatting only |
| **API** | `/api/currencies` returns INR; `/api/currencies/select` is stub |

---

## Admin Dependencies

| Admin field | Calculator impact |
| --- | --- |
| `calculator_budgets` | The options in the Budget picker on every calculator |
| `hotels.external_hotel_id` | Links venue page calculator to price data |
| `city_pages.city_id` | City filter on listing pages |
| `city_pages.total_venues` | Pagination count display |

**Calculator prices are admin-editable.** Cities, hotels, the twelve monthly
prices per hotel and the currency list all live in Postgres and are managed at
`/admin/calculator`. `/api/calculator/data` and `/data/calculator/*.json` both
answer from those tables, so every page that prices — the homepage, the
dedicated page, the ten landing pages and all 259 venue pages — picks an edit up
within a minute.

**320 hotels, 277 published.** The source dataset carries prices for 320 hotels
but lists only 259 under `hotels` and `hotelsByCity`. The other 61 are named in
`compareHotelsByCity`, which is what the seed reads for them, and all 61 are
marked `is_active: false` there, so they import with their real name, city and
room count but `published = 0`. Eighteen have since been published to fill
cities that had no hotel at all in the picker. Publishing another is a tick on
its page in `/admin/calculator/hotels`.

Andaman and Haridwar are no longer in the picker. Neither has a hotel in the
dataset at all, published or hidden, so both are `published = 0` on
`calculator_cities` -- the rows are kept because the ids are the dataset's own
and a delete would leave a gap. Their `/destination-wedding/` landing pages are
unaffected: those come from `city_pages`, a different table.

Every city the picker offers now has at least one hotel behind it.

### Price on request

Thirty-three published hotels have no room rate: 24 with every price at 0.00,
and 9 carrying meal prices but no room rate. The calculators all read a rate as
`parseFloat(price.room_price) || 0` and render the result, so without a guard
those hotels quote a wedding at zero — or worse, charge for the catering and
nothing for the rooms.

The guard is the last block of `site-public/js/currency-switcher.js`, which all
272 calculator pages already load, so it needs no page markup or stored shell
changes:

- A `click` listener on `document` in the **capture** phase runs ahead of each
  page's own handler. The rate test needs the dataset promise, so the first
  click is swallowed and replayed with `data-viraaya-rates-checked` once the
  answer is known.
- The hotel comes from `.hotel-select` (comparison), `#hotelSelect` (homepage,
  dedicated page, city pages) or `#hotelId` (venue pages), in that order.
- Unpriced means no room rate in any of the twelve months. `hasRates` is keyed
  on the room rate alone, not on any of the four prices.
- `getHotelPrices` drops unpriced hotels, so the comparison table never shows
  one at zero beside real rates. A comparison where every choice is unpriced
  falls through to the same panel.

The panel is built in JS with inline styles — no Bootstrap dependency — and its
CTA opens `#BookConsultation` where the page has it, or goes to `/contact`.

---

## Edge Cases

| Scenario | Behavior |
| --- | --- |
| Unknown hotel ID in price lookup | Empty/error response from worker |
| Cross-origin calculator API call | 403 blocked |
| Offline/static fallback | `currency-switcher.js` serves local JSON |
| Hotel not in calculator data | No pricing shown on venue calculator |
| Hotel published with no room rate | "Price on request" panel, enquiry CTA instead of a quote |
| No hotel in the city fits the chosen band | The nearest options are listed instead, with the enquiry form; never an empty panel |
| Busiest day needs more rooms than a venue has | The venue is listed but marked over capacity and excluded from the band |
| No budget bands published | The Budget picker shows only its placeholder and the calculator asks for one |

---

## Search Flow Diagram

```mermaid
flowchart TD
  A[User types in search] --> B{site-search.js}
  B --> C[GET /hotel-search?q=]
  C --> D{Results?}
  D -->|yes| E[Show dropdown]
  D -->|no| F[Filter hotel-listing-data.json]
  F --> E
  E --> G[User clicks result]
  G --> H[Navigate to venue page]
```
