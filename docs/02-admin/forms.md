# Admin Form Fields

Every form field across the admin panel.

---

## Login (`/admin/login`)

| Label | name | Type | Required | Validation |
| --- | --- | --- | --- | --- |
| (hidden) | `next` | hidden | — | `safeReturnPath` |
| Email | `email` | email | yes | server: required |
| Password | `password` | password | yes | server: required |

---

## Setup (`/admin/setup`)

| Label | name | Type | Required | Validation |
| --- | --- | --- | --- | --- |
| Name | `name` | text | yes | server: required |
| Email | `email` | email | yes | server: email regex |
| Password | `password` | password | yes | ≥10 chars, letter+number |
| Confirm password | `confirm` | password | yes | must match password |

---

## PostForm (`app/admin/blogs/_form.tsx`)

Used on `/admin/blogs/new` and `/admin/blogs/:id`.

| Label | name | Type | Required | DB field | Max/server rules |
| --- | --- | --- | --- | --- | --- |
| (hidden) | `id` | hidden | edit | — | integer |
| Heading | `heading` | text | yes | `heading` | 300 |
| Body | `bodyHtml` | RichText | — | `body_html` | sanitized HTML |
| FAQ Question N | `faq_question_{N}` | text | — | `faqs[].question` | 400; skip if empty |
| FAQ Answer N | `faq_answer_{N}` | RichText | — | `faqs[].answer` | sanitized |
| FAQ id N | `faq_id_{N}` | hidden | — | `faqs[].id` | auto |
| Status | `status` | select | — | `status` | published/draft |
| URL slug | `slug` | text | yes | `slug` | normalized, unique |
| Category | `category` | text | — | `category` | 120 |
| Date shown | `publishedLabel` | text | — | `published_label` | 60 |
| Author | `author` | text | — | `author` | 120 |
| (hidden) | `position` | hidden | — | `position` | integer |
| Card title | `cardTitle` | text | yes | `card_title` | 300 |
| Card excerpt | `cardExcerpt` | textarea | — | `card_excerpt` | 600 |
| Card image path | `cardImage` | text | — | `card_image` | file or path |
| Card image file | `cardFile` | file | — | — | image upload |
| Title tag | `seoTitle` | text | yes | `seo_title` | 300 |
| Meta description | `metaDescription` | textarea | — | `meta_description` | 500 |
| Banner path/file | `bannerImage` / `bannerFile` | text/file | — | `banner_image` | |
| OG path/file | `ogImage` / `ogFile` | text/file | — | `og_image` | defaults to banner |

---

## Blog Sections (per section card)

| Label | name | Type | Validation |
| --- | --- | --- | --- |
| taxonomy | `taxonomy` | hidden | category \| tag |
| slug | `slug` | hidden | slug format |
| Article slugs | `posts` | textarea | one slug/line; deduped |

---

## New Venue (`/admin/hotels/new`)

| Label | name | Type | Required | DB field |
| --- | --- | --- | --- | --- |
| Venue name | `name` | text | yes | `name` |
| City | `city` | text + datalist | yes | `city` (slug) |
| URL slug | `slug` | text | yes | `slug` |
| Address | `address` | textarea | — | `address` |
| Description | `description` | RichText | — | `description` |
| Status | `status` | select | — | `status` (default draft) |
| Banner path/file | `bannerImage` / `bannerFile` | — | — | `banner_image` |
| Total room inventory | `roomInventory` | text | — | `room_inventory` |
| Indoor venues | `indoorVenues` | text | — | `indoor_venues` |
| Outdoor venues | `outdoorVenues` | text | — | `outdoor_venues` |
| Guest capacity | `guestCapacity` | text | — | `guest_capacity` |
| Reception capacity | `receptionCapacity` | text | — | `reception_capacity` |
| SEO title | `seoTitle` | text | — | `seo_title` (defaults to name) |
| Meta description | `metaDescription` | textarea | — | `meta_description` |
| Meta keywords | `metaKeywords` | text | — | `meta_keywords` |
| OG image | `ogImage` | text | — | `og_image` |
| Thumbnail | `thumbnailImage` | text | — | `thumbnail_image` |
| City label | `cityLabel` | text | — | `city_label` |
| Venue category | `venueCategory` | text | — | `venue_category` |
| Card pax | `cardPax` | text | — | `card_pax` |
| External hotel ID | `externalHotelId` | text | — | `external_hotel_id` |
| Total rooms | `totalRooms` | text | — | `total_rooms` |

**Note:** FAQ and highlights fields exist on edit page only, not create form.

---

## Edit Venue (`/admin/hotels/:id`) — additional fields

| Label | name | Type | Notes |
| --- | --- | --- | --- |
| (hidden) | `id` | hidden | |
| Highlight title N | `highlight_title_{N}` | text | both title+image required |
| Highlight image N | `highlight_image_{N}` | text | |
| Nearby venues | `nearbySlugs` | textarea | `city/slug` lines, max 12 |
| FAQ fields | same pattern as blog | | |
| Airport/station time | `airportTime`, `stationTime` | text | |
| Video ID | `videoId` | text | YouTube ID |

---

## City Edit (`/admin/cities/:city`)

| Label | name | Type | Required | DB field |
| --- | --- | --- | --- | --- |
| city | `city` | hidden | yes | `city_pages.city` |
| Venues | `venues` | textarea | — | `city_listings` order |
| Title tag | `seoTitle` | text | yes | `seo_title` |
| Meta description | `metaDescription` | textarea | — | `meta_description` |
| City ID | `cityId` | text | — | `city_id` (max 20) |
| Total venues | `totalVenues` | number | — | `total_venues` |

---

## Hero Slide (create + per-slide update)

| Label | name | Type | Required |
| --- | --- | --- | --- |
| id | `id` | hidden | update only |
| Heading | `title` | text | yes |
| Description | `description` | textarea | — |
| Badge heading | `badgeTitle` | text | — |
| Badge subtext | `badgeSubtitle` | text | — |
| Button label | `ctaLabel` | text | — |
| Button link | `ctaHref` | text | validated if label set |
| Background | `image` | file | required on create |
| Show on homepage | `published` | checkbox | `on` = live |
| direction | `direction` | hidden | up/down reorder |

---

## Labels (`/admin/labels`)

For each of 19 label keys (see `LABEL_DEFINITIONS` in labels page):

| Field | name pattern | Required | Max |
| --- | --- | --- | --- |
| Value | `value_{key}` | yes | 200 |
| Emphasis | `emphasis_{key}` | — | styled split heading |

**Keys:** `venue.amenities`, `venue.faq`, `venue.similar`, `venue.gallery`, `venue.glance`, `venue.glance.rooms/indoor/outdoor/guests/reception`, `venue.viewMore`, `venue.airport`, `venue.station`, `card.details`, `card.availability`, `card.readMore`, `blog.toc`, `blog.faq`

---

## Settings (`/admin/settings`)

| Label | name | Required | Server validation |
| --- | --- | --- | --- |
| Phone | `phone` | yes | non-empty |
| WhatsApp | `whatsappNumber` | yes | digits only, ≥10 |
| Email | `email` | yes | email regex |
| Address | `address` | yes | ≥1 line |
| Instagram | `instagramUrl` | yes | must start `https://` |
| LinkedIn | `linkedinUrl` | yes | must start `https://` |

---

## Users

**Add user:** `name`, `email`, `role` (select), `password`  
**Per account:** `role`, `status` (active/disabled), password reset field

---

## Leads

**List bulk form:** `returnTo` (hidden), `bulkStatus` (select), `ids` (checkboxes)  
**Detail update:** `id` (hidden), `status` (select from LEAD_STATUSES), `notes` (textarea, max 5000)

---

## Media Delete

| name | value |
| --- | --- |
| `key` | media R2 key |

---

## Filter Forms (GET, not server actions)

**Hotels list:** `q`, `city`, `status`, `page`  
**Leads list:** `q`, `form`, `from`, `to`, `sort`, `dir`, `page`  
**Activity:** `entity`, `who`
