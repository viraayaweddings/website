# Reusable Components

Admin panel shared components in `app/admin/_components/`.

---

## Layout & Shell

### `AdminShell` (`AdminShell.tsx`)

| Prop | Type | Purpose |
| --- | --- | --- |
| `user` | `User` | Current user (password hash stripped) |
| `title` | string | Page title |
| `subtitle` | string? | Page subtitle |
| `actions` | ReactNode? | Header action buttons |
| `children` | ReactNode | Page content |

Server component. It narrows the full `User` row to `{ name, email, role }`
before anything client-side sees it — the row also carries `password_hash`, and
passing the whole object across the boundary would serialise it into the page.
Then it lays out `SideNav`, `AdminHeaderBar` and `<main>` itself.

### `AdminHeaderBar` (`AdminHeaderBar.tsx`)

Replaced `ShellChrome`, which no longer exists. It is the client header only —
nav toggle, command palette, theme toggle — not the whole layout, and it does not
take the page's children.

| Prop | Type |
| --- | --- |
| `user` | `{ name, email, role }` |
| `title` | string |

Also exports `ADMIN_NAV_OPEN_EVENT`, the event name `SideNav` listens on so the
mobile nav can be opened from the header without the two sharing state.

> The previous entry gave `ShellChrome` five props including `children`,
> describing it as the client layout that wrapped the page. `AdminShell` does the
> layout, and it is a server component; the header takes two props.
> `subtitle` and `actions` are `AdminShell`'s, not the header's.

### `SideNav` (`SideNav.tsx`)

| Prop | Type | Purpose |
| --- | --- | --- |
| `role` | string | Filter nav items |
| `name`, `email` | string | User display |
| `open` | boolean | Mobile drawer state |
| `onClose` | function | Close drawer |

Uses `navGroupsFor(role)` from `nav.ts`. Includes logout POST form.

---

## Navigation

### `nav.ts`

| Export | Purpose |
| --- | --- |
| `NAV` | Full nav group definitions |
| `navFor(role)` | Flat filtered nav items |
| `navGroupsFor(role)` | Grouped filtered nav |
| `navLabel(pathname)` | Breadcrumb label (longest match) |

**Used by:** SideNav, CommandPalette, AdminHeaderBar.

---

## Form Controls (`FormControls.tsx`)

| Component | Props | Purpose |
| --- | --- | --- |
| `SubmitButton` | `children`, `variant?`, `size?`, `icon?`, `block?`, `pendingLabel?`, `name?`, `value?`, `confirm?`, `formAction?` | Pending state, confirm dialog |
| `UnsavedGuard` | — | `beforeunload` on dirty forms |
| `CopyButton` | `value`, `label?` | Clipboard copy |
| `LiveSearch` | `name`, `defaultValue?`, `placeholder?` | Debounced auto-submit (420ms) |
| `Spinner` | `size?` | Loading SVG |

---

## UI Primitives (`ui.tsx`)

| Component | Purpose |
| --- | --- |
| `Alert` | Status messages (error, success, info) |
| `Card`, `CardHead` | Content containers |
| `EmptyState` | No-results placeholder |
| `LinkButton` | Styled navigation link |
| `Field` | Label + input wrapper |
| `TextArea` | Multi-line input |
| `Select` | Dropdown select |
| `StatusBadge` | Colored status pill |
| `Badge` | Generic label badge |
| `DetailList` | Key-value display list |
| Formatters | `formatBytes`, `formatCount`, and the date helpers re-exported from `_lib/dates` |

### Dates and times

`ui.tsx` re-exports these from `app/admin/_lib/dates.ts`, so a page imports them
from the same place as everything else. They live in `_lib` because `ui.tsx`
contains JSX, which `node --experimental-strip-types` cannot strip — a test
cannot import it. `tests/admin-dates.test.mjs` covers the format.

| Function | Output | Use |
| --- | --- | --- |
| `formatDateTime(value)` | `24-08-2026, 21:35` | Any exact timestamp |
| `formatDate(value)` | `24-08-2026` | The date alone |
| `formatRelative(value, now)` | `3 hours ago`, falling back to `24-08-2026` past a week | List columns, where recency matters more than the exact time |
| `formatStoredTimestamp(value)` | Converts a stored ISO instant; returns anything else unchanged | Free-form data such as `lead.metadata` |

One format everywhere: **`DD-MM-YYYY`, 24-hour `HH:MM`, `Asia/Kolkata`.**

- The clock is 24-hour because a 12-hour one without a meridiem cannot
  distinguish 09:35 from 21:35 while scanning a column of submissions.
- Day and month are zero-padded so columns align.
- `null` and any invalid date render as an em dash, never `Invalid Date`.
- `formatRelative` takes `now` from the caller (`_lib/clock.ts`) so a server
  component stays pure.

**Not converted, deliberately:** `<input type="date">` values, which the HTML
spec fixes at `YYYY-MM-DD`; the leads CSV export, where an ISO-style date keeps
sorting correctly in a spreadsheet; the dashboard chart axis labels, which would
overlap; and `sitemap.xml` and JSON-LD, where ISO-8601 is required.

---

## Content Editing

### `RichText` (`RichText.tsx`)

| Prop | Type | Purpose |
| --- | --- | --- |
| `label` | string | Field label |
| `name` | string | Hidden input name |
| `defaultValue` | string? | Initial HTML |
| `hint` | string? | Help text |
| `minHeight` | number? | Editor height |
| `placeholder` | string? | Empty state text |

WYSIWYG toolbar + HTML source toggle. Syncs to hidden input. Uploads via `/admin/media/upload`.

**Used by:** Blog PostForm, hotel edit form.

### `MediaPicker` (`MediaPicker.tsx`)

Replaced `ImageInput`, which no longer exists.

| Prop | Type | Purpose |
| --- | --- | --- |
| `label` | string | Field label |
| `name` | string | Hidden field the chosen `/media/<key>` path is written to |
| `defaultValue` | string? | Current value, default `""` |
| `required` | boolean? | Required on create |
| `hint` | string? | Help text |
| `shape` | `"wide" \| "card"`? | `wide` for banners, `card` for thumbnails and social images. Default `wide` |

Browses the media library **and** uploads into it. `ImageInput` was a file input
beside a path box, so the only way to reuse a picture already on the site was to
know its key. The library is the source of truth for every image, so the field
browses it; either way the value written is the same `/media/<key>` path the
renderers expect.

Upload limits come from `worker/admin/media-config.ts`
(`MAX_UPLOAD_BYTES`, `ACCEPTED_UPLOAD_MIME_LIST`) rather than being restated
here, so the field and the server cannot disagree about what is allowed.

**Used by:** Blog PostForm, hotel edit form, hero slides, stored page editing.

### `Uploader` (`Uploader.tsx`)

Drag/drop multi-upload to `/admin/media/upload`. No props.

**Used by:** Media library page.

---

## Data Display

### `Charts` (`Charts.tsx`)

| Component | Props | Purpose |
| --- | --- | --- |
| `BarChart` | data series | SVG bar chart |
| `BreakdownBars` | categories | Horizontal breakdown |
| `Donut` | segments | Donut chart |
| `Sparkline` | values | Mini trend line |

Server-rendered SVG. Used on dashboard and media page.

---

## Interaction

### `CommandPalette` (`CommandPalette.tsx`)

| Prop | Type |
| --- | --- |
| `role` | string |

Ctrl+K shortcut. Local nav search + `/admin/search` API.

### `ConfirmDelete` (`ConfirmDelete.tsx`)

| Component | Props | Purpose |
| --- | --- | --- |
| `ConfirmDeleteBanner` | `action`, `id`, `what`, `cancelHref`, `note?` | Two-step delete |
| `DeleteRequestLink` | `href`, `label?` | Link to trigger delete confirm |

### `BulkBar` (`BulkBar.tsx`)

| Component | Props | Purpose |
| --- | --- | --- |
| `BulkSelection` | `children`, `noun?` | Bulk action bar wrapper |
| `RowCheckbox` | `id`, `label` | Row selection checkbox |

**Used by:** Leads list bulk actions.

### `ThemeToggle` (`ThemeToggle.tsx`)

Light/dark mode toggle. Exports `THEME_BOOTSTRAP` script and `THEME_KEY` localStorage key.

### `Toaster` (`Toaster.tsx`)

Reads `?error`, `?saved`, `?deleted` query params once on mount; shows toast and strips from URL.

---

## Icons (`icons.tsx`)

| Export | Props | Purpose |
| --- | --- | --- |
| `Icon` | `name`, `size?`, `className?`, `strokeWidth?` | Inline SVG icon |
| `Monogram` | `size?`, `prominent?` | Brand monogram |

Icon names match `nav.ts` icon references.

---

## Usage Map

| Component | Used in |
| --- | --- |
| AdminShell | All admin pages |
| PostForm (`blogs/_form.tsx`) | Blog create/edit |
| RichText | PostForm, hotel edit |
| MediaPicker | PostForm, hotel edit, hero, stored pages |
| ConfirmDeleteBanner | Blogs, hotels, hero lists |
| BulkBar | Leads list |
| LiveSearch | Hotels list |
| Uploader | Media page |
| Charts | Dashboard, media page |

---

## Smaller pieces

| Component | File | Purpose |
| --- | --- | --- |
| `AdminHeaderBar` | `AdminHeaderBar.tsx` | Breadcrumb, search trigger, theme toggle, account menu |
| `CharCounter` | `CharCounter.tsx` | Live character count beside length-limited fields |
| `DeleteConfirmTrigger` | `DeleteConfirmTrigger.tsx` | Opens the delete confirmation for a row |

## Error boundary

`app/admin/error.tsx` catches render failures anywhere under `/admin`. It
re-throws redirects so navigation still works, and recognises a database
failure to say so plainly instead of showing a digest with no explanation.
