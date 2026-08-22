// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { and, asc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { hotels } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { Card, EmptyState, LinkButton, StatusBadge, formatCount, formatRelative } from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { bulkDeleteHotelsAction, deleteHotelAction } from "./actions";

const PAGE_SIZE = 40;
const HOTELS_BULK_FORM = "hotels-bulk-form";

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
  const page = Math.max(1, Number.parseInt(single(params.page) || "1", 10) || 1);

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

  const [rows, totals, cities, drafts] = await Promise.all([
    (where ? listQuery.where(where) : listQuery)
      .orderBy(asc(hotels.city), asc(hotels.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    where ? countQuery.where(where) : countQuery,
    db.selectDistinct({ city: hotels.city }).from(hotels).orderBy(asc(hotels.city)),
    db.select({ total: sql<number>`count(*)` }).from(hotels).where(eq(hotels.status, "draft")),
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const draftCount = Number(drafts[0]?.total ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(query || cityFilter || statusFilter);

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, city: cityFilter, status: statusFilter, page, ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.city) search.set("city", String(merged.city));
    if (merged.status) search.set("status", String(merged.status));
    if (Number(merged.page) > 1) search.set("page", String(merged.page));
    const string = search.toString();
    return `/admin/hotels${string ? `?${string}` : ""}`;
  };

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

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
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
                  <td className="tabular-nums" style={{ color: "var(--ink-soft)" }}>
                    {hotel.totalRooms || "—"}
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
    </AdminShell>
  );
}

/** Stored paths are either a site-relative file or an R2 media key. */
function preview(value: string): string {
  return value.startsWith("/") ? value : `/media/${value}`;
}
