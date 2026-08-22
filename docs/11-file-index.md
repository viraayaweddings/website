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
| `_components/nav.ts` | Config | Navigation definitions | `NAV`, `navFor`, `navLabel` |
| `_components/AdminShell.tsx` | Component | Server page wrapper | `AdminShell` |
| `_components/ShellChrome.tsx` | Component | Client layout chrome | `ShellChrome` |
| `_components/SideNav.tsx` | Component | Side navigation | `SideNav` |
| `_components/CommandPalette.tsx` | Component | Ctrl+K search | `CommandPalette` |
| `_components/ui.tsx` | Component | UI primitives | `Field`, `Card`, `Alert`, etc. |
| `_components/FormControls.tsx` | Component | Form UX helpers | `SubmitButton`, `LiveSearch` |
| `_components/RichText.tsx` | Component | WYSIWYG editor | `RichText` |
| `_components/ImageInput.tsx` | Component | Image upload field | `ImageInput` |
| `_components/Uploader.tsx` | Component | Drag-drop upload | `Uploader` |
| `_components/ConfirmDelete.tsx` | Component | Delete confirmation | `ConfirmDeleteBanner` |
| `_components/BulkBar.tsx` | Component | Bulk selection UI | `BulkSelection`, `RowCheckbox` |
| `_components/Charts.tsx` | Component | SVG charts | `BarChart`, `Donut`, etc. |
| `_components/ThemeToggle.tsx` | Component | Dark/light toggle | `ThemeToggle`, `THEME_BOOTSTRAP` |
| `_components/Toaster.tsx` | Component | Query param toasts | `Toaster` |
| `_components/icons.tsx` | Component | SVG icons | `Icon`, `Monogram` |
| `login/page.tsx` | Page | Sign in | — |
| `login/actions.ts` | Actions | `loginAction` | — |
| `setup/page.tsx` | Page | First admin setup | — |
| `setup/actions.ts` | Actions | `createFirstAdminAction` | — |
| `logout/route.ts` | Route | Session destroy | POST handler |
| `leads/page.tsx` | Page | Lead list | — |
| `leads/[id]/page.tsx` | Page | Lead detail | — |
| `leads/actions.ts` | Actions | Lead CRUD + bulk | 5 actions |
| `leads/_query.ts` | Lib | Lead query builder | `listLeads`, `countLeads` |
| `leads/export/route.ts` | Route | CSV export | GET handler |
| `blogs/page.tsx` | Page | Article list | — |
| `blogs/new/page.tsx` | Page | Create article | — |
| `blogs/[id]/page.tsx` | Page | Edit article | — |
| `blogs/_form.tsx` | Component | PostForm | `PostForm` |
| `blogs/actions.ts` | Actions | Blog CRUD | 4 actions |
| `blogs/sections/page.tsx` | Page | Category/tag config | — |
| `blogs/sections/actions.ts` | Actions | `saveSectionAction` | — |
| `hotels/page.tsx` | Page | Venue list | — |
| `hotels/new/page.tsx` | Page | Create venue | — |
| `hotels/[id]/page.tsx` | Page | Edit venue | — |
| `hotels/actions.ts` | Actions | Hotel CRUD | 3 actions |
| `cities/page.tsx` | Page | City index list | — |
| `cities/[city]/page.tsx` | Page | Edit city page | — |
| `cities/actions.ts` | Actions | `saveCityAction` | — |
| `hero/page.tsx` | Page | Hero slider | — |
| `hero/actions.ts` | Actions | Slide CRUD | 4 actions |
| `media/page.tsx` | Page | Media library | — |
| `media/actions.ts` | Actions | `deleteMediaAction` | — |
| `media/upload/route.ts` | Route | Upload API | GET/POST |
| `settings/page.tsx` | Page | Contact details | — |
| `settings/actions.ts` | Actions | `saveSettingsAction` | — |
| `labels/page.tsx` | Page | Section headings | — |
| `labels/actions.ts` | Actions | `saveLabelsAction` | — |
| `users/page.tsx` | Page | User management | — |
| `users/actions.ts` | Actions | User CRUD | 4 actions |
| `activity/page.tsx` | Page | Audit log | — |
| `search/route.ts` | Route | Command palette API | GET |

---

## Worker (`worker/`)

| File | Purpose | Depends on |
| --- | --- | --- |
| `index.ts` | Main fetch router | All worker modules |
| `lead-email.ts` | Lead capture + Resend | `db/client`, `admin/lead-store` |
| `calculator-data.ts` | Static calculator JSON | — |
| `db/schema.ts` | Drizzle schema | drizzle-orm |
| `db/client.ts` | Postgres client + migrations | schema, migrations |
| `db/migrations.ts` | Migration SQL bundle | drizzle/*.sql |
| `db/seed-templates.ts` | Page template seeder | page-templates.generated |
| `admin/session.ts` | Cookie sessions | schema |
| `admin/password.ts` | PBKDF2 hash/verify | node:crypto |
| `admin/lead-store.ts` | Lead DB operations | schema |
| `admin/media-store.ts` | R2 upload/delete | schema, R2 binding |
| `admin/image-type.ts` | Magic-byte detection | — |
| `admin/image-references.ts` | Image usage scanner | schema |
| `admin/rich-text.ts` | HTML sanitizer | — |
| `site/inject.ts` | HTMLRewriter orchestrator | all site/* modules |
| `site/resolve-page.ts` | URL → content mapping | template, blog, hotel, static-pages |
| `site/static-pages.ts` | Pages stored whole in `static_pages` | db/client, db/schema |
| `site/static-page-paths.generated.ts` | Their paths, for the Vercel rewrites | (generated by `npm run pages:seed`) |
| `site/blog.ts` | Blog data loading | schema |
| `site/blog-inject.ts` | Blog HTML patches | blog.ts |
| `site/hotel.ts` | Hotel data loading | schema |
| `site/hotel-inject.ts` | Hotel HTML patches | hotel.ts |
| `site/venue-listing.ts` | City listing cards | schema |
| `site/hero.ts` | Hero slide loading | schema |
| `site/settings.ts` | Settings loading | schema |
| `site/labels.ts` | Labels loading | schema |
| `site/template.ts` | Page template queries | schema |
| `site/media.ts` | R2 media serving | R2 binding |

---

## App Routes (Non-Admin)

| File | Route | Purpose |
| --- | --- | --- |
| `app/page.tsx` | `/` | Null (static homepage) |
| `app/layout.tsx` | — | Root layout |
| `app/lead-route.ts` | — | Shared lead handler bridge |
| `app/api/lead/route.ts` | `/api/lead` | Lead POST |
| `app/contact/save/route.ts` | `/contact/save` | Contact form |
| `app/get_in_touch/store/route.ts` | `/get_in_touch/store` | Enquiry form |
| `app/blog-form-submit/route.ts` | `/blog-form-submit` | Blog form |
| `app/hotel-search/route.ts` | `/hotel-search` | Hotel search |

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
| `site-public/` | Cloned public website (~1000+ HTML pages) |
| `site-public/index.html` | Homepage shell |
| `site-public/blogs/` | Blog pages |
| `site-public/destination-wedding/` | Venue pages |
| `site-public/storage/` | Static images (~280MB) |

**Note:** Individual static HTML files not individually documented. See [Public Site placeholder](./public-site/README.md).
