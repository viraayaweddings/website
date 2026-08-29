// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { cityListings, cityPages, hotels } from "@/worker/db/schema";
import { adminCsrfToken } from "@/worker/admin/csrf";
import { AdminShell } from "../_components/AdminShell";
import { CsrfField } from "../_components/CsrfField";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import {
  Alert,
  Badge,
  Card,
  CardHead,
  EmptyState,
  Field,
  LinkButton,
  TextArea,
  formatCount,
} from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";
import { bulkDeleteCitiesAction, bulkPublishCitiesAction, createCityAction, deleteCityAction } from "./actions";

const CITIES_BULK_FORM = "cities-bulk-form";

/** Whitelisted so a crafted query string cannot pick an arbitrary comparator. */
const SORT_KEYS = ["city", "listed", "total", "title"] as const;
const SORT_LABELS: Record<string, string> = {
  city: "City (A-Z)",
  listed: "Most listed first",
  total: "Largest total first",
  title: "Title tag",
};

export default async function CitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const csrfToken = adminCsrfToken();

  const user = await requireRole("admin", "/admin/cities", "city pages");
  const db = await requireDb();
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "";

  const query = single(params.q).slice(0, 120).toLowerCase();
  const statusFilter = single(params.status) === "hidden" ? "hidden" : single(params.status) === "live" ? "live" : "";
  const listedFilter = single(params.listed) === "none" ? "none" : single(params.listed) === "some" ? "some" : "";
  const sort = (SORT_KEYS as readonly string[]).includes(single(params.sort))
    ? (single(params.sort) as (typeof SORT_KEYS)[number])
    : "city";

  const [pages, counts, venueCounts] = await Promise.all([
    db.select().from(cityPages).orderBy(asc(cityPages.city)),
    db
      .select({ city: cityListings.city, listed: sql<number>`count(*)` })
      .from(cityListings)
      .groupBy(cityListings.city),
    db
      .select({ city: hotels.city, total: sql<number>`count(*)` })
      .from(hotels)
      .groupBy(hotels.city),
  ]);

  const listed = new Map(counts.map((row) => [row.city, Number(row.listed)]));
  const venues = new Map(venueCounts.map((row) => [row.city, Number(row.total)]));
  const totalListed = [...listed.values()].reduce((sum, value) => sum + value, 0);
  const liveCount = pages.filter((page) => page.published === 1).length;

  const visible = pages
    .filter((page) => {
      if (statusFilter === "live" && page.published !== 1) return false;
      if (statusFilter === "hidden" && page.published === 1) return false;
      const count = listed.get(page.city) ?? 0;
      if (listedFilter === "none" && count > 0) return false;
      if (listedFilter === "some" && count === 0) return false;
      if (!query) return true;
      return [page.city, page.seoTitle, page.metaDescription, page.cityId].some((value) =>
        (value || "").toLowerCase().includes(query),
      );
    })
    .sort((a, b) => {
      if (sort === "listed") return (listed.get(b.city) ?? 0) - (listed.get(a.city) ?? 0) || a.city.localeCompare(b.city);
      if (sort === "total") return b.totalVenues - a.totalVenues || a.city.localeCompare(b.city);
      if (sort === "title") return a.seoTitle.localeCompare(b.seoTitle);
      return a.city.localeCompare(b.city);
    });

  const filtered = Boolean(query || statusFilter || listedFilter || sort !== "city");

  // Cities that have venues but no index page: the obvious next thing to add.
  const missing = [...venues.keys()]
    .filter((city) => !pages.some((page) => page.city === city))
    .sort((a, b) => a.localeCompare(b));

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, status: statusFilter, listed: listedFilter, sort, ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.status) search.set("status", String(merged.status));
    if (merged.listed) search.set("listed", String(merged.listed));
    if (merged.sort && merged.sort !== "city") search.set("sort", String(merged.sort));
    const string = search.toString();
    return `/admin/cities${string ? `?${string}` : ""}`;
  };

  const listHref = href({});

  return (
    <AdminShell
      user={user}
      title="City pages"
      subtitle={`${visible.length} of ${pages.length} cities shown, ${liveCount} live, listing ${formatCount(totalListed)} venue cards between them. Each page shows twelve at a time.`}
    >
      <div className="mb-4">
        <Alert tone="info" title="Chosen lists, not automatic ones">
          A city page shows the venues you pick, in the order you pick them — not every venue in that city. The
          total drives the &ldquo;Showing 1 – 12 of N&rdquo; line and the pager. Hiding a page does not take it
          offline: it falls back to the markup it shipped with.
        </Alert>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <form method="get" className="space-y-3">
              <AutoSubmitControls />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
                <div>
                  <span className="vw-label">Search</span>
                  <LiveSearch name="q" defaultValue={query} placeholder="City, title or ID" />
                </div>
                <label className="block">
                  <span className="vw-label">Status</span>
                  <select name="status" defaultValue={statusFilter} className="vw-select">
                    <option value="">Any status</option>
                    <option value="live">Live</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
                <label className="block">
                  <span className="vw-label">Listing</span>
                  <select name="listed" defaultValue={listedFilter} className="vw-select">
                    <option value="">Any</option>
                    <option value="some">Lists venues</option>
                    <option value="none">Lists none</option>
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
                  <LinkButton href="/admin/cities" variant="ghost" size="sm" icon="close">
                    Reset filters
                  </LinkButton>
                </div>
              ) : null}
            </form>
          </Card>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon="city"
                title={filtered ? "No city pages match these filters" : "No city pages yet"}
                action={
                  filtered ? (
                    <LinkButton href="/admin/cities" variant="secondary">
                      Clear filters
                    </LinkButton>
                  ) : null
                }
              >
                {filtered
                  ? "Try a different search term, status or listing filter."
                  : "Add one on the right and it appears at /destination-wedding/<city>/."}
              </EmptyState>
            </Card>
          ) : (
            <>
              <form id={CITIES_BULK_FORM}>
            <CsrfField />
                <input type="hidden" name="returnTo" value={listHref} />
                <BulkSelection noun="city page" formId={CITIES_BULK_FORM}>
                  <SubmitButton
                    variant="secondary"
                    size="sm"
                    icon="eye"
                    name="published"
                    value="1"
                    pendingLabel="Showing…"
                    formAction={bulkPublishCitiesAction}
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
                    formAction={bulkPublishCitiesAction}
                    confirm="Hide every selected city page? Each falls back to the markup it shipped with."
                  >
                    Hide
                  </SubmitButton>
                  <SubmitButton
                    variant="danger-quiet"
                    size="sm"
                    icon="trash"
                    pendingLabel="Deleting…"
                    formAction={bulkDeleteCitiesAction}
                    confirm="Delete every selected city page and its venue list? The venues keep their own pages."
                  >
                    Delete
                  </SubmitButton>
                </BulkSelection>
              </form>

              <Card pad={false}>
                <div className="vw-table-wrap">
                  <table className="vw-table">
                    <thead>
                      <tr>
                        <th style={{ width: "2.25rem" }}>
                          <span className="sr-only">Select</span>
                        </th>
                        <th>City</th>
                        <th>Listed</th>
                        <th>Total shown</th>
                        <th>Status</th>
                        <th>Title tag</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((page) => {
                        const count = listed.get(page.city) ?? 0;
                        return (
                          <tr key={page.city}>
                            <td>
                              <RowCheckbox id={page.city} label={`${page.city} city page`} form={CITIES_BULK_FORM} />
                            </td>
                            <td>
                              <Link
                                href={`/admin/cities/${page.city}`}
                                className="font-medium capitalize hover:underline"
                                style={{ color: "var(--ink)" }}
                              >
                                {page.city}
                              </Link>
                              <div className="vw-mono text-xs" style={{ color: "var(--ink-faint)" }}>
                                {venues.get(page.city) ?? 0} venue{(venues.get(page.city) ?? 0) === 1 ? "" : "s"} in
                                this city
                              </div>
                            </td>
                            <td>
                              {count === 0 ? (
                                <Badge tone="warn">none</Badge>
                              ) : (
                                <span className="tabular-nums">{count}</span>
                              )}
                            </td>
                            <td className="tabular-nums" style={{ color: "var(--ink-soft)" }}>
                              {page.totalVenues}
                            </td>
                            <td>
                              {page.published === 1 ? <Badge tone="ok">live</Badge> : <Badge tone="neutral">hidden</Badge>}
                            </td>
                            <td className="max-w-md truncate" style={{ color: "var(--ink-faint)" }}>
                              {page.seoTitle}
                            </td>
                            <td className="whitespace-nowrap text-right">
                              <div className="flex justify-end gap-1">
                                <LinkButton
                                  href={`/admin/cities/${page.city}`}
                                  size="sm"
                                  variant="secondary"
                                  icon="edit"
                                >
                                  Edit
                                </LinkButton>
                                <LinkButton
                                  href={`/destination-wedding/${page.city}/`}
                                  size="sm"
                                  variant="ghost"
                                  icon="external"
                                  external
                                />
                                <DeleteConfirmTrigger csrfToken={csrfToken}
                                  action={deleteCityAction}
                                  id={page.city}
                                  what={`the ${page.city} city page`}
                                  note="The venue list for this page goes with it. The venues themselves keep their own pages and stay listed anywhere else they appear."
                                  ariaLabel={`Delete the ${page.city} city page`}
                                  returnTo={listHref}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-20" pad={false}>
          <CardHead title="Add a city page" icon="plus" />
          <form action={createCityAction} className="vw-card-pad space-y-3">
            <CsrfField />
            <input type="hidden" name="returnTo" value={listHref} />
            <Field
              label="City slug"
              name="city"
              required
              list="cities-without-a-page"
              prefix="/destination-wedding/"
              hint="Lowercase and hyphenated. Venues already recorded for this city are listed automatically."
            />
            <datalist id="cities-without-a-page">
              {missing.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <Field label="Title tag" name="seoTitle" required />
            <TextArea label="Meta description" name="metaDescription" rows={3} />
            <Field
              label="City ID"
              name="cityId"
              hint="The number the venue filter and pager use. Leave blank if you do not have it yet."
            />
            <SubmitButton icon="plus" block pendingLabel="Adding…">
              Add city page
            </SubmitButton>
          </form>

          {missing.length > 0 ? (
            <div className="vw-card-pad border-t" style={{ borderColor: "var(--line)" }}>
              <p className="vw-label">Cities with venues but no page</p>
              <div className="flex flex-wrap gap-1.5">
                {missing.slice(0, 20).map((city) => (
                  <span key={city} className="vw-badge vw-badge-warn">
                    {city} · {venues.get(city) ?? 0}
                  </span>
                ))}
              </div>
              {missing.length > 20 ? (
                <p className="vw-hint">and {missing.length - 20} more.</p>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </AdminShell>
  );
}
