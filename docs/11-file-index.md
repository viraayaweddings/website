# File Index

Searchable inventory of meaningful project files.

---

## Admin Panel (`app/admin/`)

| File | Type | Purpose | Key exports |
| --- | --- | --- | --- |
| `layout.tsx` | Layout | Admin shell wrapper, noindex | — |
| `page.tsx` | Page | Dashboard | — |
| `admin.css` | CSS | `.vw-admin` design tokens | — |
| `_lib/auth.ts` | Lib | Session gates, audit | `requireUser`, `requireRole`, `recordAudit` |
| `_lib/clock.ts` | Lib | Server time helper | `currentTime` |
| `_lib/dates.ts` | Lib | The panel's one date format: `DD-MM-YYYY`, 24-hour `HH:MM`, IST | `formatDateTime`, `formatDate`, `formatRelative`, `formatStoredTimestamp` |
| `_components/nav.ts` | Config | Navigation definitions | `NAV`, `navFor`, `navLabel` |
| `_components/AdminShell.tsx` | Component | Server page wrapper | `AdminShell` |
| `_components/AdminHeaderBar.tsx` | Component | Client header: nav toggle, palette, theme | `AdminHeaderBar`, `ADMIN_NAV_OPEN_EVENT` |
| `_components/SideNav.tsx` | Component | Side navigation | `SideNav` |
| `_components/CommandPalette.tsx` | Component | Ctrl+K search | `CommandPalette` |
| `_components/ui.tsx` | Component | UI primitives | `Field`, `Card`, `Alert`, etc. |
| `_components/FormControls.tsx` | Component | Form UX helpers | `SubmitButton`, `LiveSearch` |
| `_components/RichText.tsx` | Component | WYSIWYG editor | `RichText` |
| `_components/MediaPicker.tsx` | Component | Image field: pick from the library or upload | `MediaPicker` |
| `_components/Uploader.tsx` | Component | Drag-drop upload | `Uploader` |
| `_components/ConfirmDelete.tsx` | Component | Delete confirmation | `ConfirmDeleteBanner` |
| `_components/BulkBar.tsx` | Component | Bulk selection UI | `BulkSelection`, `RowCheckbox` |
| `_components/Charts.tsx` | Component | SVG charts | `BarChart`, `Donut`, etc. |
| `_components/ThemeToggle.tsx` | Component | Dark/light toggle | `ThemeToggle`, `THEME_BOOTSTRAP` |
| `_components/Toaster.tsx` | Component | Query param toasts | `Toaster` |
| `_components/icons.tsx` | Component | SVG icons | `Icon`, `Monogram`, `IconName` |
| `_components/CharCounter.tsx` | Component | Live length counter for SEO fields | `CharCounter` |
| `_components/DeleteConfirmTrigger.tsx` | Component | Two-step delete on a list row | `DeleteConfirmTrigger` |
| `_lib/concurrency.ts` | Lib | Optimistic locking: detects a row edited by someone else since the form loaded | `VERSION_FIELD`, `readExpectedVersion`, `hasMoved`, `STALE_MESSAGE` |
| `_lib/db-errors.ts` | Lib | Turns a Postgres driver error into an admin-readable message | `adminDatabaseMessage`, `isUniqueViolation` |
| `_lib/flash.ts` | Lib | One-shot messages that survive the redirect after an action | `FLASH_COOKIE`, `flashKey`, `withFlashKey` |
| `_lib/theme.ts` | Lib | Dark/light preference and its no-flash bootstrap | `THEME_KEY`, `THEME_BOOTSTRAP` |
| `_lib/audit-labels.ts` | Lib | Renders an audit action as English, with a tone | `humanAuditAction`, `auditActionTone` |
| `loading.tsx` | UI | Route-level loading state | — |
| `not-found.tsx` | UI | Admin 404 | — |
| `error.tsx` | UI | Admin error boundary | — |
| `login/page.tsx` | Page | Sign in | — |
| `login/actions.ts` | Actions | `loginAction` | — |
| `setup/page.tsx` | Page | First admin setup | — |
| `setup/actions.ts` | Actions | `createFirstAdminAction` | — |
| `logout/route.ts` | Route | Session destroy | POST handler |
| `leads/page.tsx` | Page | Lead list | — |
| `leads/[id]/page.tsx` | Page | Lead detail | — |
| `leads/actions.ts` | Actions | Lead CRUD + bulk | 5 actions |
| `leads/_query.ts` | Lib | Lead query builder | `listLeads`, `countLeads`, `listFormOptions` |
| `leads/_status.ts` | Lib | Status vocabulary and quick filters | `LEAD_STATUS_LABELS`, `LEAD_QUICK_FILTERS` |
| `leads/export/route.ts` | Route | CSV export | GET handler |
| `blogs/page.tsx` | Page | Article list | — |
| `blogs/new/page.tsx` | Page | Create article | — |
| `blogs/[id]/page.tsx` | Page | Edit article | — |
| `blogs/_form.tsx` | Component | PostForm | `PostForm` |
| `blogs/actions.ts` | Actions | Blog CRUD + bulk | 5 actions |
| `blogs/sections/page.tsx` | Page | Category/tag config | — |
| `blogs/sections/actions.ts` | Actions | `saveSectionAction` | — |
| `hotels/page.tsx` | Page | Venue list | — |
| `hotels/new/page.tsx` | Page | Create venue | — |
| `hotels/[id]/page.tsx` | Page | Edit venue | — |
| `hotels/actions.ts` | Actions | Venue CRUD, bulk, wedding-type vocabulary | 6 actions |
| `cities/page.tsx` | Page | City index list | — |
| `cities/[city]/page.tsx` | Page | Edit city page | — |
| `cities/actions.ts` | Actions | City page CRUD, bulk, total sync | 6 actions |
| `hero/page.tsx` | Page | Hero slider | — |
| `hero/actions.ts` | Actions | Slide CRUD + bulk | 5 actions |
| `media/page.tsx` | Page | Media library | — |
| `media/MediaLibrary.tsx` | Component | The library grid, its detail drawer and usage list | `MediaLibrary`, `MediaLibraryItem`, `MediaReferenceView` |
| `media/actions.ts` | Actions | Delete, bulk delete, replace | 3 actions |
| `media/upload/route.ts` | Route | Upload API | GET/POST |
| `settings/page.tsx` | Page | Contact details | — |
| `settings/actions.ts` | Actions | `saveSettingsAction` | — |
| `labels/page.tsx` | Page | Section headings | — |
| `labels/actions.ts` | Actions | `saveLabelsAction` | — |
| `users/page.tsx` | Page | User management | — |
| `users/actions.ts` | Actions | User CRUD + bulk | 5 actions |
| `activity/page.tsx` | Page | Audit log | — |
| `activity/actions.ts` | Actions | Delete, bulk delete, prune | 3 actions |
| `activity/constants.ts` | Config | Default retention window | `PRUNE_DAYS` |
| `account/page.tsx` | Page | The signed-in user's own account | — |
| `account/actions.ts` | Actions | Own password, profile, sign-out-everywhere | 3 actions |
| `pages/page.tsx` | Page | Pages stored whole in `static_pages` | — |
| `pages/[path]/page.tsx` | Page | One stored page | — |
| `pages/actions.ts` | Actions | Stored page CRUD, reset, bulk | 6 actions |
| `calculator/page.tsx` | Page | Calculator cities, currencies, taxes | — |
| `calculator/hotels/page.tsx` | Page | Calculator venues | — |
| `calculator/hotels/[id]/page.tsx` | Page | One venue and its twelve months | — |
| `calculator/actions.ts` | Actions | Calculator dataset CRUD, bulk, import | 14 actions |
| `settings/seed-actions.ts` | Actions | `importSiteContentAction` | — |
| `search/route.ts` | Route | Command palette API | GET |
| `health/route.ts` | Route | Schema readiness; detail for admins only | GET |
| `health/r2/route.ts` | Route | R2 round-trip check | GET |
| `seed/route.ts` | Route | Imports the bundled content seed | GET/POST |

---

## Worker (`worker/`)

| File | Purpose | Depends on |
| --- | --- | --- |
| `env.ts` | Reads DATABASE_URL / R2 config out of the environment | — |
| `html-rewriter.ts` | Installs `HTMLRewriter` on Node via `html-rewriter-wasm` | html-rewriter-wasm |
| `lead-email.ts` | Lead capture + Resend | `db/client`, `admin/lead-store`, `lead-csrf` |
| `lead-csrf.ts` | Issues and reads the lead form's CSRF token | — |
| `lead-fields.ts` | Finds a name/phone/email/date in an arbitrary payload | — |
| `legacy-lead.ts` | The three retired form paths, answering 410 | — |
| `calculator-data.ts` | Builds the legacy calculator JSON shapes **from the database** | `site/calculator-store` |
| `public-endpoints.ts` | Venue autocomplete | `db/schema` |
| `db/schema.ts` | Drizzle schema — 23 tables | drizzle-orm |
| `db/client.ts` | Postgres client; applies migrations on first access | schema, apply-pg-migrations |
| `db/apply-pg-migrations.ts` | The live Postgres migrations | `drizzle-pg/*.sql` |
| `db/migrations.ts` | Legacy SQLite bundle, kept for its seed data | `drizzle/*.sql` |
| `db/seed-content.ts` | Replays the legacy seeds through `sqliteToPostgres` | migrations |
| `db/seed-calculator.ts` | Seeds the five calculator tables | schema, operational-cities |
| `db/operational-cities.ts` | Which cities a fresh database ships selectable | — |
| `db/seed-templates.ts` | Page template seeder | page-templates.generated |
| `db/errors.ts` | Classifies driver errors | — |
| `admin/session.ts` | Cookie sessions | schema |
| `admin/password.ts` | PBKDF2 hash/verify | node:crypto |
| `admin/rate-limit.ts` | Cross-instance attempt counters | schema (`rate_limits`) |
| `admin/lead-store.ts` | Lead DB operations | schema |
| `admin/lead-csv.ts` | CSV export, with a formula-injection guard | — |
| `admin/lead-filters.ts` | Parses and re-serialises the lead list filters | — |
| `admin/media-store.ts` | R2 upload/release, content-addressed | schema, storage/r2 |
| `admin/media-config.ts` | Upload size and MIME ceilings | — |
| `admin/media-path.ts` | `/media/<key>` ↔ key conversion | — |
| `admin/image-type.ts` | Magic-byte detection and dimensions | — |
| `admin/image-references.ts` | Image usage scanner across every column | schema |
| `admin/rich-text.ts` | HTML sanitizer | `html-rewriter` |
| `admin/form-rows.ts` | Bounded parsing of repeating form rows | — |
| `admin/record-id.ts` | Rejects an out-of-range id before it reaches SQL | — |
| `storage/r2.ts` | R2 over the S3 API | @aws-sdk/client-s3 |
| `site/inject.ts` | HTMLRewriter orchestrator | all site/* modules |
| `site/render-page.ts` | Renders a database-owned page; owns `isDatabaseOwnedPath` | resolve-page, inject |
| `site/resolve-page.ts` | URL → content mapping | template, blog, hotel, static-pages |
| `site/public-html.ts` | Shared enhancements: skip link, font preloads, lazy images | city-menu, header-nav |
| `site/city-menu.ts` | Prunes the hard-coded mega-menu and venue filter to the published cities | — |
| `site/header-nav.ts` | Restores the header's Home item and marks the current page | — |
| `site/footer.ts` | Renders the site footer, injected on every response | escape, settings |
| `site/serve-static.ts` | Reads a file out of `site-public`; owns `cacheControlFor` | — |
| `site/app-routes.ts` | Which prefixes the App Router owns | — |
| `site/public-routes.ts` | Redirects and consultation slots | — |
| `site/static-pages.ts` | Pages stored whole in `static_pages` | db/client, db/schema |
| `site/static-page-paths.generated.ts` | Their paths, for the Vercel rewrites | (generated by `npm run pages:seed`) |
| `site/static-routes.generated.ts` | The static route list for the build | (generated) |
| `site/blog.ts` | Blog data loading | schema |
| `site/blog-inject.ts` | Blog HTML patches | blog.ts |
| `site/hotel.ts` | Hotel data loading | schema |
| `site/hotel-inject.ts` | Hotel HTML patches | hotel.ts |
| `site/venue-listing.ts` | City listing cards | schema |
| `site/venue-listing-data.ts` | Loads the listing payload for a city | venue-listing-payload |
| `site/venue-listing-payload.ts` | Builds the JSON the listing script reads | schema |
| `site/venue-listing-inject.ts` | Patches the listing markup | venue-listing |
| `site/venue-types.ts` | The wedding-type filter vocabulary | schema (`venue_types`) |
| `site/calculator-store.ts` | Reads the five calculator tables | schema |
| `site/calculator-inject.ts` | Patches calculator markup | calculator-store |
| `site/legacy-calculator-endpoints.ts` | The original Laravel endpoint shapes | calculator-store |
| `site/city-heading.ts` | Renders a city index heading | labels |
| `site/content-version.ts` | Cross-instance cache invalidation | schema (`content_version`) |
| `site/image-dimensions.ts` | Stamps width/height onto `<img>` server-side | schema (`media`) |
| `site/json-ld.ts` | Structured data for every page type | settings |
| `site/sitemap.ts` | Builds `sitemap.xml` from the database | schema |
| `site/escape.ts` | `escapeHtml`, used by every injector | — |
| `site/hero.ts` | Hero slide loading | schema |
| `site/settings.ts` | Settings loading | schema |
| `site/labels.ts` | Labels loading | schema |
| `site/template.ts` | Page template queries | schema |
| `site/media.ts` | R2 media serving, with the legacy fallback | storage/r2, serve-static |

---

## App Routes (Non-Admin)

| File | Route | Purpose |
| --- | --- | --- |
| `app/[[...path]]/route.ts` | `/*` | The catch-all: database-rendered pages, static fallback, redirects, 404. **There is no `app/page.tsx`** — `/` is handled here |
| `app/layout.tsx` | — | Root layout |
| `app/lead-route.ts` | — | Shared lead handler bridge (a module, not a route) |
| `app/_lib/deprecated-lead-route.ts` | — | The retired form paths' 410 handler (a module, not a route) |
| `app/api/lead/route.ts` | `/api/lead` | Lead POST |
| `app/contact/save/route.ts` | `/contact/save` | Contact form |
| `app/get_in_touch/store/route.ts` | `/get_in_touch/store` | Enquiry form |
| `app/blog-form-submit/route.ts` | `/blog-form-submit` | Blog form |
| `app/hotel-search/route.ts` | `/hotel-search` | Venue autocomplete |
| `app/api/lead/csrf/route.ts` | `/api/lead/csrf` | Issues the lead CSRF token |
| `app/media/[...path]/route.ts` | `/media/*` | R2 objects, with the `site-public` fallback |
| `app/sitemap.xml/route.ts` | `/sitemap.xml` | Generated from the database |
| `app/get-cities/route.ts` | `/get-cities` | Calculator cities |
| `app/get-hotels-by-city/route.ts` | `/get-hotels-by-city` | Hotels for `?city=` |
| `app/get-hotels-by-city/[city]/route.ts` | `/get-hotels-by-city/:city` | The same, city in the path |
| `app/get-hotel-price/[hotel]/[month]/route.ts` | `/get-hotel-price/:hotel/:month` | One month's prices |
| `app/get-hotel-prices/route.ts` | `/get-hotel-prices` | All twelve months |
| `app/api/calculator/data/route.ts` | `/api/calculator/data` | The whole calculator dataset |
| `app/api/currencies/route.ts` | `/api/currencies` | Published currencies |
| `app/api/currencies/select/route.ts` | `/api/currencies/select` | POST: stores the choice in a cookie |
| `app/data/calculator/[file]/route.ts` | `/data/calculator/:file` | The legacy JSON filenames, from the tables |
| `app/data/hotel-listing-data.json/route.ts` | `/data/hotel-listing-data.json` | The venue listing payload |
| `app/appointment/slots/route.ts` | `/appointment/slots` | Consultation slot times |
| `app/api/health/db/route.ts` | `/api/health/db` | Database reachability |
| `app/api/health/html/route.ts` | `/api/health/html` | Whether `HTMLRewriter` is available |

---

## Build & Config

| File | Purpose |
| --- | --- |
| `vite.config.ts` | Vite + Vinext + Cloudflare config |
| `build/sites-vite-plugin.ts` | Post-build hosting patch |
| `build/verify-*.py` | Render verification scripts |
| `drizzle.config.ts` | Drizzle Kit config |
| `drizzle/0000–0024_*.sql` | Database migrations |
| `.openai/hosting.json` | Deployment bindings |
| `.env.example` | Env var template |

---

## Documentation System

| File | Purpose |
| --- | --- |
| `docs/README.md` | Master index |
| `docs/META.md` | Version metadata (auto-updated) |
| `docs/manifest.json` | Documented entity registry |
| `docs/generated/code-inventory.json` | Code scan output |
| `docs/generated/validation-report.json` | Validation results |
| `scripts/docs-inventory.mjs` | Code scanner |
| `scripts/docs-validate.mjs` | Sync validator |
| `scripts/docs-sync.mjs` | Sync orchestrator |
| `.githooks/pre-commit` | Optional git hook |

---

## Static Site

| Path | Purpose |
| --- | --- |
| `site-public/` | Cloned public website: 292 `index.html` pages, 433 files in all |
| `site-public/index.html` | Homepage shell |
| `site-public/blogs/` | Blog pages |
| `site-public/destination-wedding/` | Venue pages |
| `site-public/storage/` | Static images (~280MB) |

**Note:** The 292 static pages are documented by pattern, not file by file — see
[Page Types](./public-site/page-types.md). The full path list is in
`docs/generated/code-inventory.json` under `staticSiteRoutes`.
