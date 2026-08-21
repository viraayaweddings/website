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

Server component wrapper. Passes safe user to client `ShellChrome`.

### `ShellChrome` (`ShellChrome.tsx`)

Client layout: header, breadcrumb, side nav, command palette, theme toggle, toaster.

| Prop | Type |
| --- | --- |
| `user` | `{ name, email, role }` |
| `title` | string |
| `subtitle` | string? |
| `actions` | ReactNode? |
| `children` | ReactNode |

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

**Used by:** SideNav, CommandPalette, ShellChrome breadcrumb.

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
| Formatters | `formatDate`, `formatRelative`, etc. |

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

### `ImageInput` (`ImageInput.tsx`)

| Prop | Type | Purpose |
| --- | --- | --- |
| `label` | string | Field label |
| `pathName` | string? | Hidden path field name |
| `fileName` | string | File input name |
| `current` | string? | Current image URL |
| `hint` | string? | Help text |
| `required` | boolean? | Required on create |
| `shape` | string? | Preview aspect ratio |

Preview + path text + file upload.

**Used by:** Blog PostForm, hotel edit form, hero slides.

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
| ImageInput | PostForm, hotel edit, hero |
| ConfirmDeleteBanner | Blogs, hotels, hero lists |
| BulkBar | Leads list |
| LiveSearch | Hotels list |
| Uploader | Media page |
| Charts | Dashboard, media page |
