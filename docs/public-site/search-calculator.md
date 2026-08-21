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
| **Handler** | `worker/index.ts` → `calculator-data.searchIndex` |
| **Results** | Max 8 hotel name matches |
| **Fallback** | Client filter on `/data/hotel-listing-data.json` |
| **Auth** | None |

### City Autocomplete (Calculator)

| | |
| --- | --- |
| **API** | `GET /get-cities?search={term}` |
| **Auth** | Same-origin required |
| **Data** | `worker/calculator-data.ts` (India cities only) |
| **Fallback** | `currency-switcher.js` → static JSON |

---

## Calculator Data Architecture

| Source | Location | Updates require |
| --- | --- | --- |
| Worker bundle | `worker/calculator-data.ts` (~30k lines) | Code change + redeploy |
| Static JSON | `site-public/data/calculator/*.json` | File edit + deploy |
| D1 database | **Not used** for calculator pricing | — |

### Static JSON files

| File | Contents |
| --- | --- |
| `cities.json` | Indian cities |
| `hotels.json` | All hotels flat list |
| `hotels-by-city.json` | Hotels grouped by city |
| `prices.json` | Monthly price matrix |
| `currencies.json` | INR only |

### Worker-served calculator endpoints

| Endpoint | Auth | Data |
| --- | --- | --- |
| `/data/calculator/cities.json` | None | India-filtered |
| `/data/calculator/hotels.json` | None | India-filtered |
| `/data/calculator/hotels-by-city.json` | None | India-filtered |
| `/data/calculator/prices.json` | None | Full matrix |
| `/data/calculator/currencies.json` | None | INR only |
| `/get-cities` | Same-origin | Autocomplete |
| `/get-hotels-by-city` | Same-origin | Hotels for city |
| `/get-hotels-by-city/:cityId` | Same-origin | By ID |
| `/get-hotel-price/:id/:month` | Same-origin | Single hotel/month |
| `/post /get-hotel-prices` | Same-origin | Batch lookup |
| `/api/calculator/availability-data` | Same-origin | Widget data |

**Blocked (404):** `/data/calculator/calculator-data.json`, `/data/calculator/availability-data.json`

---

## Calculator Tools by Page

### 1. Hotel Cost Calculator (`/hotel-cost-calculator/`)

| | |
| --- | --- |
| **Purpose** | Estimate wedding costs across multiple hotels |
| **UI** | Multi-step: city → hotels → dates → guest count → breakdown |
| **APIs** | Calculator endpoints above |
| **Output** | Client-side cost table with GST |
| **Lead capture** | Optional CTA forms (lead-forms.js) |

### 2. Compare Hotels (`/compare-hotel/`)

| | |
| --- | --- |
| **Purpose** | Side-by-side price comparison (up to 5 hotels) |
| **APIs** | `/get-hotels-by-city`, POST `/get-hotel-prices` |
| **Output** | Comparison table with currency formatting |

### 3. Venue Page Calculator (~259 pages)

| | |
| --- | --- |
| **Purpose** | Per-venue cost estimate with date picker |
| **API** | `GET /get-hotel-price/{external_hotel_id}/{month}` |
| **Hotel ID** | From `hotels.external_hotel_id` (admin-managed or static HTML) |
| **UI** | Inline flatpickr + day sections + offcanvas breakdown |

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
| `site-public/data/hotel-listing-data.json` | Full venue metadata for client filter + search fallback |
| `site-public/data/calculator/*.json` | Offline calculator fallback |

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
| `hotels.external_hotel_id` | Links venue page calculator to price data |
| `city_pages.city_id` | City filter on listing pages |
| `city_pages.total_venues` | Pagination count display |

**Calculator prices themselves are NOT admin-editable** — they live in `worker/calculator-data.ts` and static JSON.

---

## Edge Cases

| Scenario | Behavior |
| --- | --- |
| Unknown hotel ID in price lookup | Empty/error response from worker |
| Cross-origin calculator API call | 403 blocked |
| Offline/static fallback | `currency-switcher.js` serves local JSON |
| Hotel not in calculator data | No pricing shown on venue calculator |

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
