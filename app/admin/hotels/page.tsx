// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { hotels } from "@/worker/db/schema";
import { loadCalculatorConfig } from "@/worker/site/calculator-store";
import { loadAllVenueTypes } from "@/worker/site/venue-types";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { Badge, Card, CardHead, EmptyState, Field, LinkButton, StatusBadge, formatCount, formatRelative } from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { bulkDeleteHotelsAction, deleteHotelAction, deleteVenueTypeAction, saveVenueTypeAction } from "./actions";

const PAGE_SIZE = 40;
const HOTELS_BULK_FORM = "hotels-bulk-form";

/** Whitelisted so a crafted query string cannot order by an arbitrary column. */
const SORTS = {
  city: { label: "City, then name", order: [asc(hotels.city), asc(hotels.name)] },
  name: { label: "Name (A–Z)", order: [asc(hotels.name)] },
  recent: { label: "Recently edited", order: [desc(hotels.updatedAt)] },
  oldest: { label: "Least recently edited", order: [asc(hotels.updatedAt)] },
  newest: { label: "Newest first", order: [desc(hotels.id)] },
} as const;

type SortKey = keyof typeof SORTS;

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "";

  const query = single(params.q).slice(0, 120);
  const cityFilter = single(params.city).slice(0, 120);
  const statusFilter = single(params.status) === "draft" ? "draft" : single(params.status) === "published" ? "published" : "";
  const sort: SortKey = single(params.sort) in SORTS ? (single(params.sort) as SortKey) : "city";
  const requestedPage = Math.max(1, Number.parseInt(single(params.page) || "1", 10) || 1);

  const user = await requireUser("/admin/hotels");
  const db = await requireDb();
  const now = await currentTime();

  const clauses: SQL[] = [];
  if (query) {
    // % and _ would act as wildcards; drizzle's like() adds no ESCAPE clause.
    const needle = `%${query.replace(/[%_]/g, " ").trim()}%`;
    const match = or(like(hotels.name, needle), like(hotels.slug, needle), like(hotels.city, needle));
    if (match) clauses.push(match);
  }
  if (cityFilter) clauses.push(eq(hotels.city, cityFilter));
  if (statusFilter) clauses.push(eq(hotels.status, statusFilter));
  const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const listQuery = db.select().from(hotels);
  const countQuery = db.select({ total: sql<number>`count(*)` }).from(hotels);

  const [totals, cities, drafts, calculator, weddingTypeRows] = await Promise.all([
    where ? countQuery.where(where) : countQuery,
    db.selectDistinct({ city: hotels.city }).from(hotels).orderBy(asc(hotels.city)),
    db.select({ total: sql<number>`count(*)` }).from(hotels).where(eq(hotels.status, "draft")),
    loadCalculatorConfig(),
    loadAllVenueTypes(),
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const draftCount = Number(drafts[0]?.total ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamped, so a stale link lands on the last page instead of an empty table.
  const page = Math.min(requestedPage, lastPage);

  const rows = await (where ? listQuery.where(where) : listQuery)
    // Ties broken by id so paging cannot show the same venue twice.
    .orderBy(...SORTS[sort].order, asc(hotels.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const filtered = Boolean(query || cityFilter || statusFilter || sort !== "city");

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, city: cityFilter, status: statusFilter, sort, page, ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.city) search.set("city", String(merged.city));
    if (merged.status) search.set("status", String(merged.status));
    if (merged.sort && merged.sort !== "city") search.set("sort", String(merged.sort));
    if (Number(merged.page) > 1) search.set("page", String(merged.page));
    const string = search.toString();
    return `/admin/hotels${string ? `?${string}` : ""}`;
  };

  const listHref = href({});

  return (
    <AdminShell
      user={user}
      title="Venues"
      subtitle={`${formatCount(total)} venue${total === 1 ? "" : "s"}${filtered ? " matching these filters" : " across the site"}${draftCount && !filtered ? `, ${draftCount} in draft` : ""}.`}
      actions={
        <LinkButton href="/admin/hotels/new" icon="plus" variant="primary">
          New venue
        </LinkButton>
      }
    >

      <Card className="mb-4">
        <form method="get" className="space-y-3">
          <AutoSubmitControls />
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: "", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: `Drafts${draftCount ? ` · ${draftCount}` : ""}` },
            ].map((option) => (
              <Link
                key={option.label}
                href={href({ status: option.value, page: 1 })}
                className="vw-chip"
                data-on={statusFilter === option.value}
              >
                {option.label}
              </Link>
            ))}
            {filtered ? (
              <Link href="/admin/hotels" className="vw-btn vw-btn-ghost vw-btn-sm ml-auto">
                <Icon name="close" size={13} />
                Reset
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <div>
              <span className="vw-label">Search</span>
              <LiveSearch name="q" defaultValue={query} placeholder="Venue name, slug or city" />
            </div>

            <label className="block">
              <span className="vw-label">City</span>
              <select name="city" defaultValue={cityFilter} className="vw-select">
                <option value="">All cities</option>
                {cities.map((row) => (
                  <option key={row.city} value={row.city}>
                    {row.city}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="vw-label">Sort</span>
              <select name="sort" defaultValue={sort} className="vw-select">
                {Object.entries(SORTS).map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <input type="hidden" name="status" value={statusFilter} />
            <button type="submit" className="vw-btn vw-btn-secondary">
              <Icon name="filter" size={15} />
              Apply
            </button>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="venue"
            title={filtered ? "No venues match these filters" : "No venues yet"}
            action={filtered ? <LinkButton href="/admin/hotels" variant="secondary">Clear filters</LinkButton> : undefined}
          >
            {filtered ? "Try a different city, or clear the filters." : "Add the first venue to get started."}
          </EmptyState>
        </Card>
      ) : (
        <>
        {isAdmin(user) ? (
          <form id={HOTELS_BULK_FORM}>
            <input type="hidden" name="returnTo" value={listHref} />
            <BulkSelection noun="venue" formId={HOTELS_BULK_FORM}>
              <SubmitButton
                variant="danger-quiet"
                size="sm"
                icon="trash"
                pendingLabel="Deleting…"
                formAction={bulkDeleteHotelsAction}
                confirm="Delete every selected venue? This cannot be undone."
              >
                Delete
              </SubmitButton>
            </BulkSelection>
          </form>
        ) : null}

        <div className="vw-table-wrap">
          <table className="vw-table">
            <thead>
              <tr>
                {isAdmin(user) ? (
                  <th style={{ width: "2.25rem" }}>
                    <span className="sr-only">Select</span>
                  </th>
                ) : null}
                <th>Venue</th>
                <th>City</th>
                <th>Rooms</th>
                <th>Status</th>
                <th>Edited</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((hotel) => (
                <tr key={hotel.id}>
                  {isAdmin(user) ? (
                    <td>
                      <RowCheckbox id={hotel.id} label={hotel.name || hotel.slug} form={HOTELS_BULK_FORM} />
                    </td>
                  ) : null}
                  <td>
                    <div className="flex items-center gap-2.5">
                      {hotel.thumbnailImage || hotel.bannerImage ? (
                        // Plain img: these come from R2 or site-public, not the asset pipeline.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview(hotel.thumbnailImage || hotel.bannerImage)}
                          alt=""
                          className="vw-thumb h-9 w-12 flex-none"
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="vw-thumb grid h-9 w-12 flex-none place-items-center"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          <Icon name="image" size={14} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <Link
                          href={`/admin/hotels/${hotel.id}`}
                          className="block truncate font-medium hover:underline"
                          style={{ color: "var(--ink)" }}
                        >
                          {hotel.name || hotel.slug}
                        </Link>
                        <span className="vw-mono block truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                          /{hotel.city}/{hotel.slug}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="capitalize" style={{ color: "var(--ink-soft)" }}>
                    {hotel.city}
                  </td>
                  {/*
                    Room count comes from the cost calculator, which is the only
                    place it is stored now. "Not linked" is not cosmetic: that
                    venue's calculator has no rates and no cap behind it.
                  */}
                  <td className="tabular-nums" style={{ color: "var(--ink-soft)" }}>
                    {calculator.roomsByHotel[hotel.externalHotelId.trim()] ?? (
                      <span className="vw-hint">not linked</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={hotel.status} />
                  </td>
                  <td className="whitespace-nowrap text-xs" style={{ color: "var(--ink-faint)" }}>
                    {formatRelative(hotel.updatedAt, now)}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <LinkButton href={`/admin/hotels/${hotel.id}`} size="sm" variant="secondary" icon="edit">
                        Edit
                      </LinkButton>
                      <LinkButton
                        href={`/destination-wedding/${hotel.city}/${hotel.slug}`}
                        size="sm"
                        variant="ghost"
                        icon="external"
                        external
                      />
                      {isAdmin(user) ? (
                        <DeleteConfirmTrigger
                          action={deleteHotelAction}
                          id={hotel.id}
                          what={hotel.name || hotel.slug}
                          note="A venue that shipped with the site keeps its page online and reverts to the original built-in version. One added here disappears completely."
                          ariaLabel={`Delete ${hotel.name || hotel.slug}`}
                          returnTo={listHref}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {lastPage > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Pages">
          <span style={{ color: "var(--ink-faint)" }}>
            Page {page} of {lastPage}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <LinkButton href={href({ page: page - 1 })} size="sm" icon="chevronLeft">
                Previous
              </LinkButton>
            ) : null}
            {page < lastPage ? (
              <LinkButton href={href({ page: page + 1 })} size="sm">
                Next
              </LinkButton>
            ) : null}
          </div>
        </nav>
      ) : null}

      {isAdmin(user) ? (
        <div className="mt-4">
          <Card pad={false}>
            <CardHead
              title="Wedding types"
              icon="grid"
              hint="The filter list on /hotel-listing and every city page"
            />
            <div className="vw-card-pad" style={{ borderBottom: "1px solid var(--line)" }}>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                These rows render three things at once: the Wedding Type filters a visitor sees, the tag
                checkboxes on each venue, and the tags in the listing dataset. The number is what appears in
                a listing URL as <code>wedding_types[]</code>, so it is kept rather than reassigned.
              </p>
            </div>
            {weddingTypeRows.length === 0 ? (
              <EmptyState icon="grid" title="No wedding types yet">
                Add one; until then /hotel-listing shows no Wedding Type filter.
              </EmptyState>
            ) : (
              <div className="vw-table-wrap">
                <table className="vw-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Slug</th>
                      <th>Label</th>
                      <th>Shown</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weddingTypeRows.map((type) => (
                      <tr key={type.id}>
                        <td className="vw-mono">{type.id}</td>
                        <td className="vw-mono">{type.slug}</td>
                        <td>{type.label}</td>
                        <td>
                          {type.published === 1 ? (
                            <Badge tone="ok">shown</Badge>
                          ) : (
                            <Badge tone="neutral">hidden</Badge>
                          )}
                        </td>
                        <td className="text-end">
                          <form
                            action={saveVenueTypeAction}
                            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
                          >
                            <input type="hidden" name="typeId" value={type.id} />
                            <Field label="Slug" name="slug" defaultValue={type.slug} required />
                            <Field label="Label" name="label" defaultValue={type.label} required />
                            <Field label="Order" name="position" defaultValue={String(type.position)} />
                            <div className="space-y-2 text-start">
                              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                                <input
                                  type="checkbox"
                                  name="published"
                                  className="vw-check"
                                  defaultChecked={type.published === 1}
                                />
                                <span>Shown</span>
                              </label>
                              <SubmitButton size="sm" icon="check">
                                Save
                              </SubmitButton>
                            </div>
                          </form>
                          <form action={deleteVenueTypeAction} className="mt-2 flex justify-end">
                            <input type="hidden" name="typeId" value={type.id} />
                            <SubmitButton
                              size="sm"
                              variant="danger-quiet"
                              icon="trash"
                              pendingLabel="Removing…"
                              confirm={`Remove ${type.label}? Only possible while no venue is tagged with it.`}
                            >
                              Remove
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
              <form action={saveVenueTypeAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <Field label="Slug" name="slug" placeholder="beach" required hint="Letters, digits and hyphens." />
                <Field label="Label" name="label" placeholder="Beach Wedding" required />
                <Field label="Order" name="position" placeholder="6" />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                    <input type="checkbox" name="published" className="vw-check" defaultChecked />
                    <span>Shown</span>
                  </label>
                  <SubmitButton size="sm" icon="plus" pendingLabel="Adding…">
                    Add type
                  </SubmitButton>
                </div>
              </form>
            </div>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}

/** Stored paths are either a site-relative file or an R2 media key. */
function preview(value: string): string {
  return value.startsWith("/") ? value : `/media/${value}`;
}
