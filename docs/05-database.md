# Database Documentation

**Technology:** Neon Postgres via Drizzle ORM (`postgres.js`)  
**ORM:** Drizzle ORM 0.45  
**Schema file:** `worker/db/schema.ts`  
**Client:** `worker/db/client.ts` (auto-applies migrations on first access)  
**Migrations:** `drizzle/0000`–`0024`, bundled in `worker/db/migrations.ts`

---

## Tables Overview

| Table | Purpose | Admin UI |
| --- | --- | --- |
| `users` | Admin panel accounts | `/admin/users` |
| `sessions` | Cookie session tokens | (internal) |
| `leads` | Form submissions | `/admin/leads` |
| `audit_log` | Change audit trail | `/admin/activity` |
| `settings` | Contact/social key-value store | `/admin/settings` |
| `media` | R2 upload metadata | `/admin/media` |
| `hero_slides` | Homepage carousel | `/admin/hero` |
| `blog_posts` | Blog articles | `/admin/blogs` |
| `hotels` | Venue pages | `/admin/hotels` |
| `city_listings` | Curated venue order per city | `/admin/cities` |
| `blog_listings` | Curated post order per category/tag | `/admin/blogs/sections` |
| `page_templates` | Full HTML page shells | (internal, seeded) |
| `city_pages` | City index SEO + pagination | `/admin/cities` |
| `site_labels` | Section heading text | `/admin/labels` |

**Runtime-only table:** `__migrations` — tracks applied migration names.

---

## Entity Relationships

```
users ──< sessions
users ──< audit_log (nullable FK, SET NULL on delete)

city_listings ──> hotels (logical: venue_city + venue_slug)
blog_listings ──> blog_posts (logical: post_slug)

hotels ──> page_templates (shell_key)
blog_posts ──> page_templates (shell_key)
city_pages ──> page_templates (shell_key)

media ── referenced by hero_slides.image_key, hotels.*_image, blog_posts.*_image (logical)
```

Only formal FKs: `sessions.user_id → users.id` (CASCADE), `audit_log.user_id → users.id` (SET NULL).

---

## Table Details

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `email` | TEXT | Unique |
| `name` | TEXT | |
| `password_hash` | TEXT | `pbkdf2$iter$salt$hash` |
| `role` | TEXT | `admin` \| `editor` |
| `status` | TEXT | `active` \| `disabled` |
| `created_at`, `updated_at` | INTEGER ms | |
| `last_login_at` | INTEGER ms | Nullable |

### `sessions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | |
| `user_id` | TEXT FK | → users, CASCADE |
| `token_hash` | TEXT | SHA-256 of cookie value |
| `expires_at` | INTEGER ms | 7-day TTL |
| `ip`, `user_agent` | TEXT | Nullable |

### `leads`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER PK AI | |
| `form_id`, `form_name` | TEXT | e.g. `contact-form` |
| `page_url` | TEXT | |
| `name`, `email`, `phone` | TEXT | Denormalized for filtering |
| `fields` | TEXT JSON | Full payload |
| `metadata` | TEXT JSON | IP, UA, referrer |
| `status` | TEXT | new, contacted, qualified, won, lost, spam |
| `notes` | TEXT | Admin notes |
| `email_sent` | INTEGER 0/1 | Resend success flag |

### `audit_log`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER PK AI | |
| `user_id` | TEXT FK nullable | SET NULL on user delete |
| `user_email` | TEXT | Denormalized |
| `action` | TEXT | e.g. `blog.updated` |
| `entity`, `entity_id` | TEXT | Target |
| `detail` | TEXT JSON | |

### `settings`

Key/value store. Keys: `phone`, `whatsappNumber`, `email`, `address`, `instagramUrl`, `linkedinUrl`. Values JSON-encoded.

### `media`

| Column | Type | Notes |
| --- | --- | --- |
| `key` | TEXT PK | R2 object key |
| `filename` | TEXT | Original name |
| `content_type` | TEXT | MIME |
| `size` | INTEGER | Bytes |
| `uploaded_by` | TEXT | Editor email |

### `hero_slides`

Carousel slides with `position`, `published`, `image_key`, title/description, badge, CTA fields.

### `blog_posts`

Full article content: slug, status, position, SEO fields, heading, body_html, faqs (JSON), card fields, shell_key.

### `hotels`

Venue pages: city+slug (unique), status, SEO, description, at-a-glance fields, highlights (JSON), faqs (JSON), listing card fields, nearby_slugs (JSON), video_id, external_hotel_id.

### `city_listings`

Curated venue grid: `city`, `venue_city`, `venue_slug`, `position`.

### `blog_listings`

Curated taxonomy pages: `taxonomy`, `taxonomy_slug`, `post_slug`, `position`.

### `page_templates`

Full HTML shells keyed by `key` (e.g. `venue:a`, `blog:a`, `home`). Seeded from `worker/db/page-templates.generated.ts`.

### `city_pages`

Per-city index: SEO, `city_id`, `total_venues`, `shell_key`.

### `site_labels`

Editable headings: `key`, `value`, `emphasis` (for styled split headings).

---

## UI → API → Database Mapping

| UI Action | Handler | Tables |
| --- | --- | --- |
| Login | `loginAction` | users, sessions, audit_log |
| Create article | `createPostAction` | blog_posts, media |
| Edit city page | `saveCityAction` | city_pages, city_listings |
| Contact form submit | `handleLeadRequest` | leads (+ Resend) |
| Upload image | POST `/admin/media/upload` | media, R2 |
| Save contact details | `saveSettingsAction` | settings |
| View homepage | Worker injection | hero_slides, settings, labels |
| View venue | Worker injection | hotels, page_templates, site_labels |

---

## Migration History

| Range | Schema change |
| --- | --- |
| 0000 | users, sessions, leads, audit_log |
| 0001 | settings, media, hero_slides |
| 0003 | blog_posts |
| 0005 | hotels |
| 0007 | city_listings + hotel card fields |
| 0009 | venue_category |
| 0011 | card_pax |
| 0013 | blog_listings |
| 0015 | page_templates, city_pages, shell_key |
| 0017 | total_venues |
| 0019 | video_id |
| 0022 | site_labels |
| Even numbers (0002, 0004, etc.) | Seed data only |

---

## Important Queries

| Operation | Location |
| --- | --- |
| Session lookup | `worker/admin/session.ts` → `getUserByToken` |
| Lead filtering | `app/admin/leads/_query.ts` |
| Image reference scan | `worker/admin/image-references.ts` |
| Page resolution | `worker/site/resolve-page.ts` |
| Hero load | `worker/site/hero.ts` |
| Settings load | `worker/site/settings.ts` (30s cache) |
| Labels load | `worker/site/labels.ts` |

---

## State Transitions

### Lead status

```
new → contacted → qualified → won
                           → lost
                           → spam
```

No enforced state machine — any status can be set directly.

### User status

```
active ↔ disabled (blocks login)
```

### Content status

```
draft ↔ published (blog_posts, hotels)
```

Draft content visible only with `?preview=1` + admin session.
