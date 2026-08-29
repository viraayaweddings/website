# Page data sources

Companion to [AUDIT-CALCULATORS.md](AUDIT-CALCULATORS.md), which counts the
3 unique calculators / 5 code copies / 272 instances this document traces.

**Every value the calculators and the venue listing show now comes from
Postgres and is editable in the admin panel.** No page reads a data file. This
document records what each value is, where it lives, how it reaches the page,
and what keeps it that way.

## The calculator data

| Value | Table | Admin screen |
| --- | --- | --- |
| Cities in the picker | `calculator_cities` | `/admin/calculator` |
| Hotels in the picker | `calculator_hotels` | `/admin/calculator/hotels` |
| Room capacity (the rooms-input cap) | `calculator_hotels.total_rooms` | `/admin/calculator/hotels/<id>` |
| Room and meal prices, per hotel per month | `calculator_prices` | `/admin/calculator/hotels/<id>` |
| Currency, symbol, rate | `calculator_currencies` | `/admin/calculator` |
| **Tax lines and rates** | `calculator_taxes` | `/admin/calculator` |
| Which venue page uses which calculator hotel | `hotels.external_hotel_id` | `/admin/hotels/<id>` |
| **Event Spaces Gallery** | `hotels.gallery` | `/admin/hotels/<id>` |

Adding, editing, hiding or deleting any row changes every one of the 272
calculator instances within about 15 seconds. Nothing needs a deploy.

## How each value reaches the page

Two routes, both from the same tables.

**Fetched by the page.** `currency-switcher.js` installs a `fetch` and
`jQuery.ajax` interceptor that answers `/get-cities`, `/get-hotels-by-city`,
`/get-hotel-price/…`, `/get-hotel-prices` and `/api/currencies` from a single
`GET /api/calculator/data`. If that call fails the page retries the individual
routes, which are the same handlers over the same tables.

**Injected into the markup.** [worker/site/calculator-inject.ts](worker/site/calculator-inject.ts)
runs on every render and does two things:

- rebuilds `#citySelect` from `calculator_cities`;
- appends `window.__VIRAAYA_CALC__` to `<head>` carrying the cities, the tax
  lines and the currencies.

Venue pages additionally get `#hotelId` and `#hotelTotalRooms` set by
[worker/site/hotel-inject.ts](worker/site/hotel-inject.ts), the cap read from
`calculator_hotels`.

Tax is rendered by the shared `ViraayaTax` helper in `currency-switcher.js`,
which all five code copies call. One published tax row becomes one summary row,
in `position` order; the total is the subtotal plus all of them. Adding a third
line in the panel adds a third row to every quote on the site.

## What changed

Before this work, four things a calculator showed were not data:

| Was | Now |
| --- | --- |
| 53 `<option>` rows baked into `#citySelect` on 12 pages | injected from `calculator_cities`; the stored markup holds only the placeholder |
| A 53-id "India cities" allowlist in the home page script | deleted; `calculator_cities.published` is what hides a city |
| CGST 9% + SGST 9% written into 4 script copies, `× 1.18` in a 5th | `calculator_taxes`, rendered by one shared helper |
| `hotels.total_rooms`, a second capacity field nothing kept in step | gone from the venue form; `calculator_hotels` is the only source |

And four file-based sources were removed from the serving path:

- `site-public/data/calculator/*.json` — **deleted.** The route at
  `/data/calculator/<file>.json` answers from the database.
- The bundled `worker/calculator-data.ts` fallback in the JSON routes, the
  legacy `/get-*` handlers and `/api/currencies`. The bundle is now a **seed
  only**, read once by `seedCalculatorData()` into empty tables.
- `/hotel-search`, which read the bundle through the hardcoded allowlist, so
  admin renames never changed what the search box suggested.
- `worker/site/calculator-prices.ts` — a dead D1-era override that merged a
  settings JSON blob over the bundled price table. No consumers; deleted.

### Failing safe

There is deliberately no fallback to a file. If the database cannot be read:

- prices are absent, so the existing **"Price on request"** overlay fires;
- the city picker is **empty** rather than showing a stale list;
- the tax config is absent, so `ViraayaTax.available()` is false and the summary
  shows the subtotal with *"taxes confirmed with your quote"* — it never invents
  a rate.

The injected `<head>` block also carries a small `ViraayaTax` safety net, so a
page whose `currency-switcher.js` never loads still renders a summary instead of
throwing. That net returns a multiplier of `1`: it will under-state a total, and
say so, rather than assume 18%.

## Keeping it that way

The markup exists in three places that must not drift, and only the first is
touched by a deploy:

| Where | Kept in step by |
| --- | --- |
| `site-public/**/*.html` | `npm run data:detach` |
| `worker/db/page-templates.generated.ts` (the 7 calculator shells) | the same command |
| `page_templates` / `static_pages` rows | `scripts/migrate-stored-pages.mjs`, run by the Vercel build |

All three share one transform,
[scripts/lib/page-data-transform.mjs](scripts/lib/page-data-transform.mjs).
It is idempotent and reports rather than guesses, which is why the database pass
is safe on every deploy: it rewrites each row once and is a no-op afterwards.
It edits the stored markup **in place** rather than replacing the row from its
file, so an admin's own edits to those pages survive.

### Commands

```bash
npm run data:audit
```

Reports any page, shell or stored row still carrying a hardcoded rate, an
allowlist or a baked city list; any venue whose `external_hotel_id` names no
calculator hotel; and the current tax, city, hotel and price counts. Exits
non-zero on a finding, so it can gate a deploy.

```bash
npm run data:migrate
```

Applies the transform to the stored rows by hand. The Vercel build already does
this; the command is for a local or manually-migrated database.

### Tests

`tests/page-data-sources.test.mjs` (19 tests, no database needed) fails if a
hardcoded rate, an allowlist or a baked city list reappears in any source page
or generated shell, if a calculator stops calling `ViraayaTax`, if the static
JSON files come back, or if the safety net starts assuming a rate.

### Guards in the panel

- Saving a venue with a **Hotel ID that names no calculator hotel is refused**.
  Blank is still allowed — a venue can be published before it is priced — but a
  wrong id used to render a working-looking calculator that quoted zero.
- `/admin/calculator` shows an error banner listing any published venue whose
  calculator link is broken.
- `/admin/hotels` shows each venue's room count from the calculator, or
  "not linked".
- `/admin/calculator` warns when no tax line is published, because every quote
  then shows its subtotal as the total.

### Cache behaviour

`calculator-store.ts` now registers with `onContentChanged`, which every other
content module already did. An admin write bumps `content_version`; other warm
instances drop their calculator cache on their next render rather than waiting
out a 30-second TTL. The JSON endpoints carry
`max-age=15, stale-while-revalidate=60`, which is what actually bounds how stale
a visitor's copy can be.

---

## The venue listing

`/data/hotel-listing-data.json` was the last generated data file: 53 cities and
259 venue cards for the `/hotel-listing` filters and the site-search fallback.
It is **deleted**; the path is served from
[app/data/hotel-listing-data.json/route.ts](app/data/hotel-listing-data.json/route.ts).

Most of the payload was already derivable, and is now derived per request:

| Field | Source |
| --- | --- |
| `id` | `hotels.external_hotel_id` — the same id the calculator joins on |
| `name` | `hotels.name` |
| `city`, `city_id` | the calculator city for that hotel |
| `rooms` | `calculator_hotels.total_rooms` |
| `capacity` | `hotels.card_pax`, falling back to `guest_capacity`, exactly as the cards print it |
| `image` | `hotels.thumbnail_image` |
| `url` | `/destination-wedding/<city>/<slug>` |
| `search` | name + city, lowercased |

Two things were not derivable from any column and became new ones in
`0008_venue_wedding_types.sql`:

- **`hotels.wedding_types`** — the destination / city / resort / palace /
  luxury / intimate tags, backfilled for all 259 venues.
- **`hotels.listing_position`** — the card order. The generated file opened
  with six chosen venues and then followed no rule, so the order is data, not
  something to recompute. It is now a field on the venue form, so "put this one
  first" is an edit rather than a regeneration.

### The wedding-type vocabulary

The six types were written out three times: as filter checkboxes on
`/hotel-listing` and all 53 city index pages, as a `weddingTypes` map inside
`hotel-listing.js`, and as tags on each venue. They are now one table,
`venue_types`, and all three read it:

- the filter checkboxes are injected by
  [worker/site/venue-listing-inject.ts](worker/site/venue-listing-inject.ts),
  and the baked markup was stripped so there is no second copy;
- `hotel-listing.js` reads the id→slug map from the injected
  `window.__VIRAAYA_LISTING__`;
- the venue form's tag checkboxes come from the same rows, and a save is
  refused a slug that is not one of them.

Managed on `/admin/hotels`. The ids are assigned rather than serial: `wedding_types[]=5`
appears in shared and indexed listing URLs, so a type keeps its number.
Deleting a type is refused while any venue still carries it — unpublishing is
how a filter comes down without untagging anything.

### Proving the payload did not change

[tests/venue-listing-payload.test.mjs](tests/venue-listing-payload.test.mjs)
holds the generated file as it last shipped and feeds the builder the rows the
migration created from it, asserting the payload comes back identical — all 259
cards, every field, same order. `/hotel-listing` filters and pages entirely on
that shape, so a renamed key or a reordered list is a broken page rather than a
subtle regression.

---

## Nothing is left in a file

Every value on a calculator or a listing page comes from Postgres. The two
remaining data modules on disk are seeds, never read on a request:

- `worker/calculator-data.ts` — read once by `seedCalculatorData()` into empty
  tables.
- `tests/fixtures/hotel-listing-before.json` — the generated listing file as it
  last shipped, kept only as the expectation in the test above.
