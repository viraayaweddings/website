# Public Website — Page Types

Taxonomy of all customer-facing page types.

**Total pages:** 292 static `index.html` files + the paths the database owns.
Was 370 before eight cities were withdrawn; see `scripts/lib/retired-cities.mjs`.

---

## Page Type Reference

| Type | Count | URL pattern | Static file | CMS injection |
| --- | ---: | --- | --- | --- |
| Homepage | 1 | `/` | ✓ | Hero, settings |
| Contact | 1 | `/contact/` | ✓ | Contact details |
| About | 1 | `/about-us/` | ✓ | Social links |
| FAQs | 1 | `/faqs/` | ✓ | — |
| Blog index | 1 | `/blogs/` | ✓ | Post grid |
| Blog article | 11 | `/blogs/{slug}/` | ✓ | Full article |
| Blog category | 2 | `/blogs/category/{slug}/` | ✓ | Filtered grid |
| Blog tag | 2 | `/blogs/tag/{slug}/` | ✓ | Filtered grid |
| City venue index | 53 | `/destination-wedding/{city}/` | ✓ | Cards, SEO, pagination |
| Venue detail | 259 | `/destination-wedding/{city}/{slug}/` | ✓ | Full venue content |
| City SEO landing | 10 | `/destination-wedding-in-{city}/` | ✓ | — (forms only) |
| Hotel listing | 1 | `/hotel-listing/` | ✓ | Partial |
| Calculator | 1 | `/hotel-cost-calculator/` | ✓ | — |
| Compare hotels | 1 | `/compare-hotel/` | ✓ | — |
| Check availability | 1 | `/check-hotel-availability/` | ✓ | — |
| Wedding packages | 4 | `/wedding-packages/*` | ✓ | — |
| Real weddings | 5 | `/real-weddings/*` | ✓ | — |
| Consultation | 2 | `/wedding-consultation/`, `/appointment-booking/` | ✓ | — |
| Payment pages | 2 | `/appointment/payment-*` | ✓ | — |
| Legal | 3 | privacy, terms, cookie | ✓ | — |
| Marketing | 2 | `/package/`, `/past-weddings-all/` | ✓ | — |
| Form stubs | 3 | contact/save, etc. | ✓ | — |

---

## Shared UI Chrome (Most Pages)

### Header

| Element | Behavior |
| --- | --- |
| Logo | Links to `/` |
| Megamenu | Hotels tab with city sub-navigation |
| Search icon | Opens `#searchbox` overlay |
| CTA buttons | "Book Consultation", "Get Quote" → modals |
| Mobile menu | Toggle via `custom.js` |

### Footer

| Element | Source |
| --- | --- |
| Contact info | Injected from `settings` on contact-related pages; static on others |
| Social links | Injected Instagram/LinkedIn from `settings` |
| Legal links | Static — privacy, terms, cookie policy |
| City links | Static megamenu-style links |

### Floating Elements

| Element | Behavior |
| --- | --- |
| WhatsApp button | `wa.me` link from injected `settings.whatsappNumber` |
| Modals | Bootstrap modals for consultation and enquiry |

---

## Venue Detail Page Anatomy

**Template:** Static HTML + `hotel-inject.ts` patches

| Section | CMS field | Label key |
| --- | --- | --- |
| SEO head | `seo_title`, `meta_description`, `og_image` | — |
| Banner | `banner_image`, `name` | — |
| At a glance | `room_inventory`, capacities, etc. | `venue.glance.*` |
| Description | `description` (HTML) | — |
| Amenities/highlights | `highlights` JSON | `venue.amenities` |
| Gallery | `highlights`, `banner_image` | `venue.gallery` |
| FAQ | `faqs` JSON | `venue.faq` |
| Nearby venues | `nearby_slugs` | `venue.similar` |
| Enquiry form | `#enquiryForm` | — |
| Cost calculator | Inline JS | uses `external_hotel_id` |
| Video tour | YouTube embed | `video_id` |

---

## City Index Page Anatomy

| Section | CMS source |
| --- | --- |
| SEO title/description | `city_pages` |
| Results summary | `city_pages.total_venues` |
| Venue card grid | `city_listings` → `hotels` |
| Pagination | `venue-listing.ts` (12 per page) |
| Sidebar enquiry form | Static form → `/api/lead` |
| Filter form | `#filterForm` → client-side |

---

## Blog Article Page Anatomy

| Section | CMS source |
| --- | --- |
| SEO / OG / canonical | `blog_posts` |
| Banner + heading | `blog_posts.banner_image`, `heading` |
| Author, date | `published_label`, `author` |
| Body | `body_html` |
| Table of contents | Auto-generated from headings |
| FAQ accordion | `faqs` JSON |
| Sidebar enquiry | `#contactForm` → `/api/lead` |

---

## Static-Only Page Types

These pages are **not** managed via admin CMS:

| Type | Edit method |
| --- | --- |
| Real weddings | Edit HTML in `site-public/real-weddings/` |
| Wedding packages | Edit HTML in `site-public/wedding-packages/` |
| City landing pages | Edit HTML in `site-public/destination-wedding-in-*/` |
| Legal pages | Edit HTML directly |
| About, FAQs | Edit HTML directly |
| Calculator/compare pages | Edit HTML + `calculator-data.ts` for data |

---

## Responsive Behavior

| Breakpoint behavior | Implementation |
| --- | --- |
| Mobile megamenu | `custom.js` toggle |
| Filter sidebar popup | Mobile-only in `custom.js` |
| Responsive tables | Bootstrap classes in static HTML |
| Touch carousels | Slick carousel |

**Not systematically tested** across all 367 pages — see audit findings.

---

## Error States

| State | Behavior |
| --- | --- |
| 404 | No custom page — platform default |
| Empty search results | Dropdown shows "no results" in `site-search.js` |
| Form validation error | Inline errors via `lead-forms.js` |
| API failure | Error message in form status region |

---

## User Authentication Pages

**None exist.** The public site has no login, registration, password reset, or account pages.

Admin authentication is documented in [Admin Panel](../02-admin/README.md).
