# Public Website — JavaScript

Client-side behavior on the public site.

**No build step** — scripts loaded directly from `site-public/`.

---

## Site-Specific Scripts (`site-public/js/`)

| File | Purpose | Loaded on |
| --- | --- | --- |
| `lead-forms.js` | Universal lead capture, validation, AJAX submit | All pages with POST forms |
| `site-search.js` | Header search → `/hotel-search?q=` | Most pages (header) |
| `hotel-listing.js` | City/hotel listing filter + pagination | City indexes, `/hotel-listing/` |
| `currency-switcher.js` | INR display; intercepts calculator API calls to static JSON | Calculator, compare, venue pages |
| `mutation-observer-guard.js` | Popper stub + safe MutationObserver | Global (prevents clone JS errors) |

---

## Theme Scripts (`site-public/user/assets/js/custom.js`)

| Feature | Behavior |
| --- | --- |
| Slick carousels | Banner, stats, gallery sliders |
| Mobile megamenu | Toggle navigation drawer |
| Search overlay | Show/hide `#searchbox` overlay |
| Description expand | "View more" toggle on venue descriptions |
| Filter sidebar | Mobile popup for `#filterForm` sidebar |
| Cost summary | Offcanvas scroll reset |

---

## Third-Party Libraries (via `site-public/user/assets/vendor/` and `site-public/vendor/`)

| Library | Used for |
| --- | --- |
| jQuery | DOM manipulation, AJAX |
| Bootstrap 5 | Modals, offcanvas, layout |
| Select2 | Enhanced dropdowns |
| Flatpickr | Date pickers (consultation, calculator) |
| AOS | Scroll animations |
| Slick | Carousels |
| Font Awesome | Icons |

---

## Page-Specific Inline Scripts

### Venue Detail Pages (~259 pages)

| Feature | API calls |
| --- | --- |
| Per-venue cost calculator | `GET /get-hotel-price/{external_hotel_id}/{month}` |
| Date picker (flatpickr) | Local |
| Day-section cost breakdown | Offcanvas GST display |
| Compare link | Navigates to `/compare-hotel` |

### Hotel Cost Calculator (`/hotel-cost-calculator/`)

Large inline script block — multi-hotel selection, date ranges, cost aggregation. Uses calculator APIs or static JSON fallback via `currency-switcher.js`.

### Compare Hotels (`/compare-hotel/`)

| Feature | API calls |
| --- | --- |
| Select up to 5 hotels | `GET /get-hotels-by-city` |
| Date range pricing | `POST /get-hotel-prices` |
| GST comparison table | Client-side formatting |

### Check Availability (`/check-hotel-availability/`)

Multi-step wizard (plan → hotels → dates → contact):

| Step | Behavior |
| --- | --- |
| 1–3 | jQuery UI steps, local state |
| 4 | POST JSON to `/api/lead` |
| Success | Shows "BOOKED" UI (cosmetic only) |

### Consultation Booking (`/wedding-consultation/`, `/appointment-booking/`)

| Feature | Implementation |
| --- | --- |
| Date picker | Flatpickr inline calendar |
| Time slots | **Hardcoded** local array `11:00–19:00` |
| Form submit | `lead-forms.js` → `/api/lead` |
| Worker endpoint | `/appointment/slots` exists but **not used** by these pages |

---

## API Interception (`currency-switcher.js`)

Rewrites same-origin fetch/XHR to static JSON for offline/dev resilience:

| Original endpoint | Fallback |
| --- | --- |
| `/api/currencies` | `/data/calculator/currencies.json` |
| `/get-cities` | Static cities JSON |
| `/get-hotels-by-city` | Static hotels JSON |
| `/get-hotel-price/*` | Static prices JSON |
| `/get-hotel-prices` | Static prices JSON |

---

## Search (`site-search.js`)

```
#searchbox input
  → debounced fetch GET /hotel-search?q={term}
  → fallback: /data/hotel-listing-data.json (client filter)
  → renders results dropdown
```

Max 8 results from worker search index.

---

## Hotel Listing Filter (`hotel-listing.js`)

```
#filterForm (GET /hotel-listing)
  → reads /data/hotel-listing-data.json
  → client-side filter by city, category, search text
  → paginates results in DOM
  → no server round-trip for filtering
```

On CMS-managed city pages, venue cards are server-injected but filter may still use static JSON for full dataset.

---

## Global Modals

| Modal ID | Trigger | Form |
| --- | --- | --- |
| `#BookConsultation` | CTA buttons sitewide | `#consultationForm` |
| `#enquiryModal` | Venue enquiry buttons | `#enquiryForm` |

`lead-forms.js` includes Bootstrap modal fallback when Bootstrap JS unavailable.

---

## Accessibility Features in JS

| Feature | File |
| --- | --- |
| `aria-live="polite"` status regions | `lead-forms.js` |
| `aria-invalid` + describedby on fields | `lead-forms.js` |
| Focus management on error/success | `lead-forms.js` |
| `role="status"` on form feedback | `lead-forms.js` |

---

## Scripts NOT on Public Site

| Expected | Status |
| --- | --- |
| React/Vue/Angular app bundle | Not present |
| Service worker | Not present |
| WebSocket client | Not present |
| Payment SDK (Razorpay/Stripe) | Not present |

---

## Admin Connection

| Admin change | JS impact |
| --- | --- |
| Edit `external_hotel_id` on venue | Calculator on venue page uses new ID |
| Upload images | New `/media/{key}` URLs in injected HTML |
| Edit settings | WhatsApp href updated in HTML (not JS) |

See [Website ↔ Admin Map](./website-admin-map.md).
