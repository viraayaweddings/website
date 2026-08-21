# Public Website — Route Map

Complete URL inventory for the customer-facing site.

**Total static pages:** 367 (`index.html` files in `site-public/`)  
**Dynamic behavior:** Worker resolves some paths from D1 even without static files.

---

## Route Taxonomy

| Pattern | Count | Example | Managed by CMS? |
| --- | ---: | --- | --- |
| `/` | 1 | Homepage | Hero, settings (injected) |
| `/destination-wedding/{city}/{slug}/` | 259 | `/destination-wedding/jaipur/the-oberoi-rajvilas-jaipur/` | Yes — `hotels` table |
| `/destination-wedding/{city}/` | 53 | `/destination-wedding/jaipur/` | Yes — `city_pages`, `city_listings` |
| `/destination-wedding-in-{city}/` | 10 | `/destination-wedding-in-goa/` | Partial — forms only |
| `/blogs/` | 1 | Blog index | Yes — `blog_posts` |
| `/blogs/{slug}/` | 11 | `/blogs/when-to-book-a-wedding-venue/` | Yes — `blog_posts` |
| `/blogs/category/{slug}/` | 2 | `/blogs/category/bridal-styling/` | Yes — `blog_listings` |
| `/blogs/tag/{slug}/` | 2 | `/blogs/tag/bride/` | Yes — `blog_listings` |
| `/real-weddings/{slug}/` | 4 | `/real-weddings/aarav-meera/` | Static only |
| `/real-weddings/` | 1 | Gallery index | Static only |
| `/wedding-packages/{tier}/` | 3 | `/wedding-packages/shobhana/` | Static only |
| `/wedding-packages/` | 1 | Package index | Static only |
| Standalone utility pages | 20 | See below | Mixed |

---

## Standalone Routes

| Route | File | Purpose | Auth | CMS |
| --- | --- | --- | --- | --- |
| `/` | `site-public/index.html` | Homepage | Public | Hero, settings |
| `/about-us/` | `about-us/index.html` | About page | Public | Settings (social) |
| `/contact/` | `contact/index.html` | Contact form | Public | Settings (contact details) |
| `/faqs/` | `faqs/index.html` | FAQ page | Public | Static |
| `/package/` | `package/index.html` | Package info | Public | Static |
| `/past-weddings-all/` | `past-weddings-all/index.html` | Past weddings | Public | Static |
| `/hotel-cost-calculator/` | `hotel-cost-calculator/index.html` | Multi-hotel calculator | Public | Static data + APIs |
| `/compare-hotel/` | `compare-hotel/index.html` | Hotel comparison | Public | Static data + APIs |
| `/check-hotel-availability/` | `check-hotel-availability/index.html` | Availability wizard | Public | Static + lead API |
| `/hotel-listing/` | `hotel-listing/index.html` | Filtered hotel listing | Public | Partial injection |
| `/wedding-consultation/` | `wedding-consultation/index.html` | Consultation booking | Public | Lead only |
| `/appointment-booking/` | `appointment-booking/index.html` | Appointment booking | Public | Lead only |
| `/appointment/payment-success/` | `appointment/payment-success/index.html` | Thank-you page | Public | Static |
| `/appointment/payment-failed/` | `appointment/payment-failed/index.html` | Failure page | Public | Static |
| `/privacy-policy/` | `privacy-policy/index.html` | Legal | Public | Static |
| `/terms-of-use/` | `terms-of-use/index.html` | Legal | Public | Static |
| `/cookie-preference-policy/` | `cookie-preference-policy/index.html` | Legal | Public | Static |

### Stub / Legacy GET Targets (not user-facing forms)

| Route | Purpose |
| --- | --- |
| `/contact/save/` | Legacy form action target (JS redirects to `/api/lead`) |
| `/get_in_touch/store/` | Legacy form action target |
| `/blog-form-submit/` | Legacy blog sidebar form target |

---

## Worker API Routes (Public)

See [API Reference](../04-api.md). Key public endpoints:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/lead` | POST | Universal lead capture |
| `/contact/save` | POST | Legacy lead alias |
| `/blog-form-submit` | POST | Legacy blog form alias |
| `/hotel-search` | GET | Header search autocomplete |
| `/get-cities` | GET | Calculator city autocomplete |
| `/get-hotels-by-city` | GET | Hotels for city |
| `/get-hotel-price/{id}/{month}` | GET | Venue calculator pricing |
| `/get-hotel-prices` | POST | Compare tool batch pricing |
| `/data/calculator/*.json` | GET | Static calculator datasets |
| `/appointment/slots` | GET | Slot list (unused by booking pages) |
| `/media/*` | GET | Admin-uploaded R2 images |

---

## Dynamic Route Parameters

### City listing filter (`/hotel-listing/`)

| Param | Type | Purpose |
| --- | --- | --- |
| `city_ids[]` | array | Filter by city ID |
| `page` | number | Pagination |

### City index filter (`/destination-wedding/{city}/`)

| Param | Type | Purpose |
| --- | --- | --- |
| Filter checkboxes | GET | Client-side venue filter via `#filterForm` |

### Preview mode (all managed pages)

| Param | Value | Effect |
| --- | --- | --- |
| `preview` | `1` | Show draft content; requires admin session |

---

## Redirects

| From | To | Code | File |
| --- | --- | --- | --- |
| `/wedding-consultation` | `/wedding-consultation/` | 308 | `worker/index.ts` |

---

## Routes That Do NOT Exist

| Expected in generic wedding sites | Status |
| --- | --- |
| `/login`, `/register` | Not present |
| `/account`, `/profile` | Not present |
| `/checkout`, `/payment` | Not present (lead capture only) |
| `/404` custom page | Not present |
| `/robots.txt` | Not present |
| `/sitemap.xml` | Not present |

---

## Authentication Matrix

| Route prefix | Public | Auth required |
| --- | --- | --- |
| All `site-public` routes | ✓ | None |
| `/admin/*` | ✗ | Admin session — see [Admin docs](../02-admin/README.md) |
| `?preview=1` on public URLs | ✓* | *Admin session required |

---

## SEO Routes per Pattern

See [SEO](./seo.md) for metadata details per page type.

---

## Admin Dependencies per Route Type

See [Website ↔ Admin Map](./website-admin-map.md).
