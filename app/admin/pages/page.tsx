// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { listStaticPages } from "@/worker/site/static-pages";
import { AdminShell } from "../_components/AdminShell";
import { CsrfField } from "../_components/CsrfField";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { adminCsrfToken } from "@/worker/admin/csrf";
import {
  Badge,
  Card,
  CardHead,
  EmptyState,
  Field,
  LinkButton,
  Select,
  TextArea,
  formatRelative,
} from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { requireDb, requireRole } from "../_lib/auth";
import {
  bulkPublishPagesAction,
  bulkResetPagesAction,
  createStaticPageAction,
  resetStaticPageAction,
} from "./actions";

const PAGES_BULK_FORM = "pages-bulk-form";

/** Groups the list the way someone looking for a page would think about it. */
function sectionFor(path: string): string {
  if (path.startsWith("/destination-wedding-in-")) return "City landing pages";
  if (path.startsWith("/real-weddings")) return "Real weddings";
  if (path.startsWith("/wedding-packages") || path === "/package") return "Packages";
  if (path.startsWith("/appointment") || path === "/wedding-consultation") return "Appointments";
  if (
    path === "/privacy-policy" ||
    path === "/terms-of-use" ||
    path === "/cookie-preference-policy"
  ) {
    return "Policies";
  }
  return "Pages";
}

const ORDER = [
  "Pages",
  "City landing pages",
  "Packages",
  "Real weddings",
  "Appointments",
  "Policies",
];

/** Whitelisted so a crafted query string cannot pick an arbitrary comparator. */
const SORT_KEYS = ["path", "title", "recent"] as const;
const SORT_LABELS: Record<string, string> = {
  path: "Path (A-Z)",
  title: "Title (A-Z)",
  recent: "Recently changed",
};

export default async function StaticPagesIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const csrfToken = adminCsrfToken();

  const user = await requireRole("admin", "/admin", "the pages");
  await requireDb();
  const params = await searchParams;
  const now = await currentTime();
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "";

  const query = single(params.q).slice(0, 120).toLowerCase();
  const sectionFilter = ORDER.includes(single(params.section)) ? single(params.section) : "";
  const statusFilter =
    single(params.status) === "hidden" ? "hidden" : single(params.status) === "live" ? "live" : "";
  const sort = (SORT_KEYS as readonly string[]).includes(single(params.sort))
    ? (single(params.sort) as (typeof SORT_KEYS)[number])
    : "path";

  const pages = await listStaticPages();
  const liveCount = pages.filter((page) => page.published === 1).length;

  const visible = pages
    .filter((page) => {
      if (sectionFilter && sectionFor(page.path) !== sectionFilter) return false;
      if (statusFilter === "live" && page.published !== 1) return false;
      if (statusFilter === "hidden" && page.published === 1) return false;
      if (!query) return true;
      return [page.path, page.title, page.metaDescription].some((value) =>
        (value || "").toLowerCase().includes(query),
      );
    })
    .sort((a, b) => {
      if (sort === "title") return (a.title || a.path).localeCompare(b.title || b.path);
      if (sort === "recent") return b.updatedAt.getTime() - a.updatedAt.getTime();
      return a.path.localeCompare(b.path);
    });

  const filtered = Boolean(query || sectionFilter || statusFilter || sort !== "path");

  // Grouping is what makes a list of 33 paths findable, but it fights a chosen
  // sort, so it is kept only for the unsorted default view.
  const grouped = new Map<string, typeof visible>();
  for (const page of visible) {
    const section = sectionFor(page.path);
    const bucket = grouped.get(section) ?? [];
    bucket.push(page);
    grouped.set(section, bucket);
  }
  const groupsInOrder = sort === "path" ? ORDER.filter((section) => grouped.has(section)) : [];

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, section: sectionFilter, status: statusFilter, sort, ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.section) search.set("section", String(merged.section));
    if (merged.status) search.set("status", String(merged.status));
    if (merged.sort && merged.sort !== "path") search.set("sort", String(merged.sort));
    const string = search.toString();
    return `/admin/pages${string ? `?${string}` : ""}`;
  };

  const listHref = href({});

  const rows = (bucket: typeof visible) =>
    bucket.map((page) => (
      <tr key={page.path}>
        <td>
          <RowCheckbox id={page.path} label={page.title || page.path} form={PAGES_BULK_FORM} />
        </td>
        <td>
          <Link href={`/admin/pages/${encodeURIComponent(page.path)}`} className="vw-link">
            {page.title || page.path}
          </Link>
          <div className="vw-hint vw-mono">{page.path}</div>
        </td>
        <td className="vw-hint">
          {page.metaDescription
            ? page.metaDescription.slice(0, 90) + (page.metaDescription.length > 90 ? "…" : "")
            : "No description"}
        </td>
        <td>{page.published ? <Badge tone="ok">live</Badge> : <Badge tone="neutral">hidden</Badge>}</td>
        <td className="vw-hint whitespace-nowrap">
          {page.updatedBy ? `${formatRelative(page.updatedAt, now)} by ${page.updatedBy}` : "Not edited"}
        </td>
        <td className="whitespace-nowrap text-right">
          <div className="flex justify-end gap-1">
            <LinkButton
              href={`/admin/pages/${encodeURIComponent(page.path)}`}
              size="sm"
              variant="secondary"
              icon="edit"
            >
              Edit
            </LinkButton>
            <LinkButton
              href={page.published ? page.path : `${page.path}?preview=1`}
              size="sm"
              variant="ghost"
              icon={page.published ? "external" : "eye"}
              external
            />
            <DeleteConfirmTrigger csrfToken={csrfToken}
              action={resetStaticPageAction}
              id={page.path}
              what={`the stored copy of ${page.path}`}
              note="The page stays online: it falls back to the markup it shipped with, which is the same page without any of your changes. The next page import stores it again."
              label="Reset"
              ariaLabel={`Reset ${page.path}`}
              returnTo={listHref}
            />
          </div>
        </td>
      </tr>
    ));

  const head = (
    <thead>
      <tr>
        <th style={{ width: "2.25rem" }}>
          <span className="sr-only">Select</span>
        </th>
        <th>Page</th>
        <th>Search listing</th>
        <th>Status</th>
        <th>Last change</th>
        <th />
      </tr>
    </thead>
  );

  return (
    <AdminShell
      user={user}
      title="Pages"
      subtitle={`${visible.length} of ${pages.length} pages shown, ${liveCount} live. Their wording is fixed; their pictures and search listing are not.`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <form method="get" className="space-y-3">
              <AutoSubmitControls />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
                <div>
                  <span className="vw-label">Search</span>
                  <LiveSearch name="q" defaultValue={query} placeholder="Path, title or description" />
                </div>
                <label className="block">
                  <span className="vw-label">Section</span>
                  <select name="section" defaultValue={sectionFilter} className="vw-select">
                    <option value="">Every section</option>
                    {ORDER.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="vw-label">Status</span>
                  <select name="status" defaultValue={statusFilter} className="vw-select">
                    <option value="">Any status</option>
                    <option value="live">Live</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
                <label className="block">
                  <span className="vw-label">Sort</span>
                  <select name="sort" defaultValue={sort} className="vw-select">
                    {SORT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {SORT_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="vw-btn vw-btn-secondary">
                  <Icon name="filter" size={15} />
                  Apply
                </button>
              </div>
              {filtered ? (
                <div className="flex justify-end">
                  <LinkButton href="/admin/pages" variant="ghost" size="sm" icon="close">
                    Reset filters
                  </LinkButton>
                </div>
              ) : null}
            </form>
          </Card>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon="grid"
                title={filtered ? "No pages match these filters" : "No pages stored yet"}
                action={
                  filtered ? (
                    <LinkButton href="/admin/pages" variant="secondary">
                      Clear filters
                    </LinkButton>
                  ) : null
                }
              >
                {filtered
                  ? "Try a different search term, section or status."
                  : "Run the page import and these will appear. Until then each one is served from the markup it shipped with."}
              </EmptyState>
            </Card>
          ) : (
            <>
              <form id={PAGES_BULK_FORM}>
            <CsrfField />
                <input type="hidden" name="returnTo" value={listHref} />
                <BulkSelection noun="page" formId={PAGES_BULK_FORM}>
                  <SubmitButton
                    variant="secondary"
                    size="sm"
                    icon="eye"
                    name="published"
                    value="1"
                    pendingLabel="Showing…"
                    formAction={bulkPublishPagesAction}
                  >
                    Show
                  </SubmitButton>
                  <SubmitButton
                    variant="secondary"
                    size="sm"
                    icon="close"
                    name="published"
                    value="0"
                    pendingLabel="Hiding…"
                    formAction={bulkPublishPagesAction}
                    confirm="Hide every selected page? Each falls back to the markup it shipped with."
                  >
                    Hide
                  </SubmitButton>
                  <SubmitButton
                    variant="danger-quiet"
                    size="sm"
                    icon="refresh"
                    pendingLabel="Resetting…"
                    formAction={bulkResetPagesAction}
                    confirm="Discard every change made to the selected pages? They go back to the markup they shipped with."
                  >
                    Reset
                  </SubmitButton>
                </BulkSelection>
              </form>

              {groupsInOrder.length > 0 ? (
                groupsInOrder.map((section) => (
                  <Card key={section} pad={false}>
                    <CardHead title={section} icon="grid" hint={`${grouped.get(section)!.length} pages`} />
                    <div className="vw-table-wrap">
                      <table className="vw-table">
                        {head}
                        <tbody>{rows(grouped.get(section)!)}</tbody>
                      </table>
                    </div>
                  </Card>
                ))
              ) : (
                <Card pad={false}>
                  <CardHead title="Pages" icon="grid" hint={`${visible.length} shown`} />
                  <div className="vw-table-wrap">
                    <table className="vw-table">
                      {head}
                      <tbody>{rows(visible)}</tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          <Card>
            <p className="vw-hint mb-0">
              <Icon name="info" /> Hiding a page does not take it offline. It falls back to the markup it shipped
              with, which is the same page without any of your changes.
            </p>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20" pad={false}>
          <CardHead title="Add a page" icon="plus" />
          <form action={createStaticPageAction} className="vw-card-pad space-y-3">
            <CsrfField />
            <input type="hidden" name="returnTo" value={listHref} />
            <p className="vw-hint">
              A new page starts as a copy of one that already works, so it keeps a layout the site can render.
              Swap its pictures and its search listing, then show it.
            </p>
            <Field
              label="Path"
              name="path"
              required
              placeholder="/wedding-packages-2027"
              hint="Where the page will live. Letters, numbers, hyphens and slashes."
            />
            <Field label="Title" name="title" required />
            <TextArea label="Description" name="metaDescription" rows={3} />
            <Select
              label="Copy the layout from"
              name="source"
              options={pages.map((page) => ({ value: page.path, label: page.title || page.path }))}
              hint="Pick the page whose layout is closest to what you want."
            />
            <SubmitButton icon="plus" block pendingLabel="Creating…">
              Create page
            </SubmitButton>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
