# Admin Panel

Complete documentation for the CMS at `/admin/*`.

**Source root:** `app/admin/` (58 files)  
**Layout:** `app/admin/layout.tsx` — force-dynamic, noindex, `.vw-admin` theme  
**Auth gate:** `app/admin/_lib/auth.ts`

---

## Navigation Structure

Defined in `app/admin/_components/nav.ts`:

| Group | Route | Label | Role |
| --- | --- | --- | --- |
| Overview | `/admin` | Dashboard | all |
| Overview | `/admin/leads` | Submissions | all |
| Overview | `/admin/activity` | Activity log | admin |
| Content | `/admin/hotels` | Venues | all |
| Content | `/admin/blogs` | Articles | all |
| Content | `/admin/cities` | City pages | admin |
| Content | `/admin/hero` | Hero slider | all |
| Content | `/admin/media` | Images | all |
| Configuration | `/admin/settings` | Contact details | admin |
| Configuration | `/admin/labels` | Section headings | admin |
| Configuration | `/admin/users` | Users | admin |

**Additional routes** (not in nav): `/admin/login`, `/admin/setup`, `/admin/logout`, `/admin/blogs/new`, `/admin/blogs/sections`, `/admin/hotels/new`, dynamic `[id]` and `[city]` pages, API routes.

---

## Role Model

| Role | Capabilities |
| --- | --- |
| **admin** | Full access including users, settings, labels, cities, destructive deletes, activity log |
| **editor** | Create/edit content, manage leads (not delete), hero/venues/articles CRUD except delete |

Editors hitting admin-only URLs are redirected to `/admin?denied=1`.

---

## Modules

### Dashboard (`/admin`)

**File:** `app/admin/page.tsx`  
**Auth:** `requireUser`  
**Purpose:** Lead statistics, content counts, charts, recent submissions  
**Components:** `AdminShell`, `BarChart`, `BreakdownBars`, `Sparkline`, `Stat`  
**DB reads:** `leads`, `hotels`, `blogPosts`, `cityPages`, `heroSlides`, `media`

### Submissions / Leads (`/admin/leads`)

**Files:** `app/admin/leads/page.tsx`, `[id]/page.tsx`, `actions.ts`, `_query.ts`, `export/route.ts`  
**Auth:** `requireUser` (delete: admin)  
**Purpose:** Form submission inbox with filters, bulk actions, CSV export, email resend  
**DB:** `leads`, `audit_log`

### Activity Log (`/admin/activity`)

**File:** `app/admin/activity/page.tsx`  
**Auth:** `requireRole("admin")`  
**Purpose:** Audit timeline with entity/who filters  
**DB:** `audit_log`

### Venues / Hotels (`/admin/hotels`)

**Files:** `app/admin/hotels/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `actions.ts`  
**Auth:** `requireUser` (delete: admin)  
**Purpose:** CRUD for venue pages at `/destination-wedding/<city>/<slug>`  
**DB:** `hotels`, `city_listings` (on delete), R2 media  
**Note:** City/slug immutable after creation

### Articles / Blogs (`/admin/blogs`)

**Files:** `app/admin/blogs/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `_form.tsx`, `actions.ts`, `sections/`  
**Auth:** `requireUser` (sections + delete: admin)  
**Purpose:** Blog post CRUD, reorder, category/tag listing assignments  
**DB:** `blog_posts`, `blog_listings`, R2 media

### City Pages (`/admin/cities`)

**Files:** `app/admin/cities/page.tsx`, `[city]/page.tsx`, `actions.ts`  
**Auth:** `requireRole("admin")`  
**Purpose:** Configure which venues appear on each city index page + SEO  
**DB:** `city_pages`, `city_listings`, reads `hotels` for picker

### Hero Slider (`/admin/hero`)

**Files:** `app/admin/hero/page.tsx`, `actions.ts`  
**Auth:** `requireUser` (delete: admin)  
**Purpose:** Homepage carousel slides  
**DB:** `hero_slides`, R2 media

### Images / Media (`/admin/media`)

**Files:** `app/admin/media/page.tsx`, `actions.ts`, `upload/route.ts`  
**Auth:** `requireUser` (delete unused: admin)  
**Purpose:** R2 image library, usage tracking, upload endpoint for RichText  
**DB:** `media`, R2

### Contact Details (`/admin/settings`)

**Files:** `app/admin/settings/page.tsx`, `actions.ts`  
**Auth:** `requireRole("admin")`  
**Purpose:** Phone, WhatsApp, email, address, social links  
**DB:** `settings`

### Section Headings (`/admin/labels`)

**Files:** `app/admin/labels/page.tsx`, `actions.ts`  
**Auth:** `requireRole("admin")`  
**Purpose:** Editable site section labels (19 keys across 4 groups)  
**DB:** `site_labels`

### Users (`/admin/users`)

**Files:** `app/admin/users/page.tsx`, `actions.ts`  
**Auth:** `requireRole("admin")`  
**Purpose:** User CRUD, password reset, role/status management  
**DB:** `users`, `sessions`

### Auth Pages

| Route | File | Purpose |
| --- | --- | --- |
| `/admin/login` | `login/page.tsx` | Sign in |
| `/admin/setup` | `setup/page.tsx` | First admin bootstrap |
| `/admin/logout` | `logout/route.ts` | POST session destroy |

---

## Shared Infrastructure

| File | Purpose |
| --- | --- |
| `app/admin/_lib/auth.ts` | Session gates, audit logging, safe redirects |
| `app/admin/_lib/clock.ts` | `currentTime()` for server components |
| `app/admin/_components/AdminShell.tsx` | Server wrapper stripping password hash |
| `app/admin/_components/ShellChrome.tsx` | Client layout: header, nav, palette, theme |
| `app/admin/_components/nav.ts` | Single nav source for rail, breadcrumb, palette |
| `app/admin/admin.css` | Scoped design tokens for `.vw-admin` |

---

## API Routes (Admin)

| Route | Method | File | Auth |
| --- | --- | --- | --- |
| `/admin/search` | GET | `search/route.ts` | Session |
| `/admin/leads/export` | GET | `leads/export/route.ts` | Session |
| `/admin/media/upload` | GET, POST | `media/upload/route.ts` | Session + same-origin (POST) |
| `/admin/logout` | POST | `logout/route.ts` | None (clears cookie) |

---

## Detail Documents

- [Admin Routes](./routes.md) — complete route inventory
- [Server Actions](./actions.md) — every action with validation and DB ops
- [Form Fields](./forms.md) — every field on every form
- [Admin Workflows](./workflows.md) — end-to-end CRUD flows

## Related

- [Authentication](../06-auth.md)
- [Components](../10-components.md)
- [Workflows](../07-workflows.md)
- [Change Impact](../13-change-impact.md)
