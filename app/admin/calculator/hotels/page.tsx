// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { calculatorCities, calculatorHotels, calculatorPrices } from "@/worker/db/schema";
import { adminCsrfToken } from "@/worker/admin/csrf";
import { AdminShell } from "../../_components/AdminShell";
import { CsrfField } from "../../_components/CsrfField";
import { BulkSelection, RowCheckbox } from "../../_components/BulkBar";
import { DeleteConfirmTrigger } from "../../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../../_components/FormControls";
import { Icon } from "../../_components/icons";
import { Badge, Card, CardHead, EmptyState, Field, LinkButton, Select, formatCount } from "../../_components/ui";
import { requireDb, requireRole } from "../../_lib/auth";
import {
  bulkDeleteCalculatorHotelsAction,
  deleteCalculatorHotelAction,
  saveCalculatorHotelAction,
} from "../actions";

const PER_PAGE = 50;
const CALC_HOTELS_BULK_FORM = "calculator-hotels-bulk-form";

/** Whitelisted so a crafted query string cannot order by an arbitrary column. */
const SORTS = {
  name: { label: "Name (A-Z)", order: [asc(calculatorHotels.name)] },
  city: { label: "City, then name", order: [asc(calculatorHotels.cityId), asc(calculatorHotels.name)] },
  rooms: { label: "Most rooms first", order: [desc(calculatorHotels.totalRooms)] },
  recent: { label: "Recently edited", order: [desc(calculatorHotels.updatedAt)] },
} as const;

type SortKey = keyof typeof SORTS;

export default async function CalculatorHotelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const csrfToken = adminCsrfToken();

  const user = await requireRole("admin", "/admin/calculator/hotels", "calculator data");
  const db = await requireDb();
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "";

  const cityFilter = Number.parseInt(single(params.city), 10);
  const hasCityFilter = Number.isInteger(cityFilter) && cityFilter > 0;
  // % and _ are wildcards to Postgres and drizzle adds no ESCAPE clause.
  const query = single(params.q).slice(0, 120);
  const needle = query.replace(/[%_]/g, " ").trim();
  const statusFilter =
    single(params.status) === "hidden" ? "hidden" : single(params.status) === "shown" ? "shown" : "";
  const sort: SortKey = single(params.sort) in SORTS ? (single(params.sort) as SortKey) : "name";
  const requestedPage = Math.max(1, Number.parseInt(single(params.page) || "1", 10) || 1);

  const clauses: (SQL | undefined)[] = [
    hasCityFilter ? eq(calculatorHotels.cityId, cityFilter) : undefined,
    needle ? ilike(calculatorHotels.name, `%${needle}%`) : undefined,
    statusFilter ? eq(calculatorHotels.published, statusFilter === "shown" ? 1 : 0) : undefined,
  ];
  const where = and(...clauses);

  const [cities, totalRows, pricedRows] = await Promise.all([
    db.select().from(calculatorCities).orderBy(asc(calculatorCities.name)),
    db.select({ total: sql<number>`count(*)` }).from(calculatorHotels).where(where),
    db
      .select({ hotelId: calculatorPrices.hotelId, months: sql<number>`count(*)` })
      .from(calculatorPrices)
      .groupBy(calculatorPrices.hotelId),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Clamped, so a stale link lands on the last page rather than an empty table.
  const page = Math.min(requestedPage, pages);

  const hotels = await db
    .select()
    .from(calculatorHotels)
    .where(where)
    // Ties broken by id so paging cannot show the same hotel twice.
    .orderBy(...SORTS[sort].order, asc(calculatorHotels.id))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);

  const cityName = new Map(cities.map((city) => [city.id, city.name]));
  const monthsPriced = new Map(pricedRows.map((row) => [row.hotelId, Number(row.months)]));
  const filtered = Boolean(hasCityFilter || query || statusFilter || sort !== "name");

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = {
      city: hasCityFilter ? String(cityFilter) : "",
      q: query,
      status: statusFilter,
      sort,
      page,
      ...next,
    };
    if (merged.city) search.set("city", String(merged.city));
    if (merged.q) search.set("q", String(merged.q));
    if (merged.status) search.set("status", String(merged.status));
    if (merged.sort && merged.sort !== "name") search.set("sort", String(merged.sort));
    if (Number(merged.page) > 1) search.set("page", String(merged.page));
    const string = search.toString();
    return `/admin/calculator/hotels${string ? `?${string}` : ""}`;
  };

  const listHref = href({});

  return (
    <AdminShell
      user={user}
      title="Hotels &amp; prices"
      subtitle={`${formatCount(total)} hotel${total === 1 ? "" : "s"}${filtered ? " matching these filters" : ""}. Each one carries twelve monthly prices that the calculator adds up.`}
      actions={
        <LinkButton href="/admin/calculator" icon="chevronLeft" variant="secondary">
          Cities &amp; currencies
        </LinkButton>
      }
    >
      <Card pad={false}>
        <CardHead title="Add a hotel" icon="plus" />
        <form action={saveCalculatorHotelAction} className="vw-card-pad space-y-3">
            <CsrfField />
          <input type="hidden" name="returnTo" value={listHref} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" name="name" required placeholder="e.g. The Leela Palace Udaipur" />
            <Select
              label="City"
              name="cityId"
              defaultValue={hasCityFilter ? String(cityFilter) : ""}
              options={[
                { value: "", label: "Choose a city" },
                ...cities.map((city) => ({ value: String(city.id), label: city.name })),
              ]}
            />
            <Field
              label="Total rooms"
              name="totalRooms"
              defaultValue="0"
              hint="Caps the rooms-per-night input on the venue page."
            />
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" name="published" className="vw-check" defaultChecked />
            <span>Show in the hotel dropdown</span>
          </label>
          <SubmitButton icon="plus" pendingLabel="Adding…">
            Add hotel
          </SubmitButton>
        </form>
      </Card>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="All hotels" icon="venue" hint={`Page ${page} of ${pages}`} />

          <form method="get" className="vw-card-pad" style={{ borderBottom: "1px solid var(--line)" }}>
            <AutoSubmitControls />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
              <div>
                <span className="vw-label">Search</span>
                <LiveSearch name="q" defaultValue={query} placeholder="Hotel name" label="Search hotels" />
              </div>
              <label className="block">
                <span className="vw-label">City</span>
                <select name="city" defaultValue={hasCityFilter ? String(cityFilter) : ""} className="vw-select">
                  <option value="">Every city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={String(city.id)}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="vw-label">In the picker</span>
                <select name="status" defaultValue={statusFilter} className="vw-select">
                  <option value="">Any</option>
                  <option value="shown">Shown</option>
                  <option value="hidden">Hidden</option>
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
              <button type="submit" className="vw-btn vw-btn-secondary">
                <Icon name="filter" size={15} />
                Filter
              </button>
            </div>
            {filtered ? (
              <div className="mt-3 flex justify-end">
                <LinkButton href="/admin/calculator/hotels" variant="ghost" size="sm" icon="close">
                  Reset filters
                </LinkButton>
              </div>
            ) : null}
          </form>

          {hotels.length === 0 ? (
            <EmptyState
              icon="venue"
              title={filtered ? "No hotels match these filters" : "No hotels yet"}
              action={
                filtered ? (
                  <LinkButton href="/admin/calculator/hotels" variant="secondary">
                    Clear filters
                  </LinkButton>
                ) : null
              }
            >
              {filtered ? "Try a different city, status or search term." : "Add one above to get started."}
            </EmptyState>
          ) : (
            <>
              <form id={CALC_HOTELS_BULK_FORM} className="vw-card-pad pb-0">
            <CsrfField />
                <input type="hidden" name="returnTo" value={listHref} />
                <BulkSelection noun="hotel" formId={CALC_HOTELS_BULK_FORM}>
                  <SubmitButton
                    size="sm"
                    variant="danger-quiet"
                    icon="trash"
                    pendingLabel="Deleting…"
                    formAction={bulkDeleteCalculatorHotelsAction}
                    confirm="Delete every selected calculator hotel and its monthly prices?"
                  >
                    Delete
                  </SubmitButton>
                </BulkSelection>
              </form>
              <div className="vw-table-wrap">
                <table className="vw-table">
                  <thead>
                    <tr>
                      <th style={{ width: "2.25rem" }}>
                        <span className="sr-only">Select</span>
                      </th>
                      <th>Hotel</th>
                      <th>City</th>
                      <th>Rooms</th>
                      <th>Priced</th>
                      <th>Shown</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotels.map((hotel) => {
                      const months = monthsPriced.get(hotel.id) ?? 0;
                      return (
                        <tr key={hotel.id}>
                          <td>
                            <RowCheckbox id={hotel.id} label={hotel.name} form={CALC_HOTELS_BULK_FORM} />
                          </td>
                          <td>
                            <Link href={`/admin/calculator/hotels/${hotel.id}`} className="vw-link">
                              {hotel.name}
                            </Link>
                            <span className="vw-hint vw-mono"> #{hotel.id}</span>
                          </td>
                          <td>{cityName.get(hotel.cityId) ?? <span className="vw-hint">unassigned</span>}</td>
                          <td>{hotel.totalRooms || <span className="vw-hint">—</span>}</td>
                          <td>
                            {months === 12 ? (
                              <Badge tone="ok">12 months</Badge>
                            ) : months === 0 ? (
                              <Badge tone="bad">no prices</Badge>
                            ) : (
                              <Badge tone="warn">{months}/12</Badge>
                            )}
                          </td>
                          <td>
                            {hotel.published === 1 ? <Badge tone="ok">shown</Badge> : <Badge tone="neutral">hidden</Badge>}
                          </td>
                          <td className="text-end">
                            <div className="flex justify-end gap-1">
                              <LinkButton
                                href={`/admin/calculator/hotels/${hotel.id}`}
                                size="sm"
                                variant="secondary"
                                icon="edit"
                              >
                                Edit
                              </LinkButton>
                              <DeleteConfirmTrigger csrfToken={csrfToken}
                                action={deleteCalculatorHotelAction}
                                id={hotel.id}
                                what={`${hotel.name} and its twelve monthly prices`}
                                note="The venue page for it stays online but prices at zero until a hotel with the same id is added back."
                                ariaLabel={`Delete ${hotel.name}`}
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
            </>
          )}

          {pages > 1 ? (
            <nav
              className="vw-card-pad flex items-center justify-between gap-3 text-sm"
              style={{ borderTop: "1px solid var(--line)" }}
              aria-label="Pages"
            >
              <span style={{ color: "var(--ink-faint)" }}>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <LinkButton href={href({ page: page - 1 })} size="sm" icon="chevronLeft">
                    Previous
                  </LinkButton>
                ) : null}
                {page < pages ? (
                  <LinkButton href={href({ page: page + 1 })} size="sm">
                    Next
                  </LinkButton>
                ) : null}
              </div>
            </nav>
          ) : null}
        </Card>
      </div>
    </AdminShell>
  );
}
