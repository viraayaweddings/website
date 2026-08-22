// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { calculatorCities, calculatorHotels, calculatorPrices } from "@/worker/db/schema";
import { AdminShell } from "../../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../../_components/BulkBar";
import { LiveSearch, SubmitButton } from "../../_components/FormControls";
import { Alert, Badge, Card, CardHead, EmptyState, Field, LinkButton, Select, formatCount } from "../../_components/ui";
import { requireDb, requireRole } from "../../_lib/auth";
import { bulkDeleteCalculatorHotelsAction, saveCalculatorHotelAction } from "../actions";

const PER_PAGE = 50;
const CALC_HOTELS_BULK_FORM = "calculator-hotels-bulk-form";

export default async function CalculatorHotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string; page?: string; error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/calculator/hotels", "calculator data");
  const db = await requireDb();
  const params = await searchParams;

  const cityFilter = Number.parseInt(String(params.city || ""), 10);
  const query = String(params.q || "").trim();
  const page = Math.max(1, Number.parseInt(String(params.page || "1"), 10) || 1);

  const where = and(
    Number.isInteger(cityFilter) && cityFilter > 0 ? eq(calculatorHotels.cityId, cityFilter) : undefined,
    query ? ilike(calculatorHotels.name, `%${query}%`) : undefined,
  );

  const [cities, hotels, totalRows, pricedRows] = await Promise.all([
    db.select().from(calculatorCities).orderBy(asc(calculatorCities.name)),
    db
      .select()
      .from(calculatorHotels)
      .where(where)
      .orderBy(asc(calculatorHotels.name))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)` }).from(calculatorHotels).where(where),
    db
      .select({ hotelId: calculatorPrices.hotelId, months: sql<number>`count(*)` })
      .from(calculatorPrices)
      .groupBy(calculatorPrices.hotelId),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const cityName = new Map(cities.map((city) => [city.id, city.name]));
  const monthsPriced = new Map(pricedRows.map((row) => [row.hotelId, Number(row.months)]));

  const keep = (extra: Record<string, string>) => {
    const next = new URLSearchParams();
    if (params.city) next.set("city", String(params.city));
    if (query) next.set("q", query);
    for (const [key, value] of Object.entries(extra)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    return search ? `/admin/calculator/hotels?${search}` : "/admin/calculator/hotels";
  };

  return (
    <AdminShell
      user={user}
      title="Hotels &amp; prices"
      subtitle={`${formatCount(total)} hotels. Each one carries twelve monthly prices that the calculator adds up.`}
      actions={<LinkButton href="/admin/calculator" icon="chevronLeft" variant="secondary">Cities &amp; currencies</LinkButton>}
    >
      {params.error ? (
        <div className="mb-4"><Alert tone="error" title="That did not save">{params.error}</Alert></div>
      ) : null}
      {params.saved ? (
        <div className="mb-4"><Alert tone="success" title="Saved">{params.saved}</Alert></div>
      ) : null}

      <Card pad={false}>
        <CardHead title="Add a hotel" icon="plus" />
        <form action={saveCalculatorHotelAction} className="vw-card-pad space-y-3">
          <Field label="Name" name="name" required placeholder="e.g. The Leela Palace Udaipur" />
          <Select
            label="City"
            name="cityId"
            defaultValue={params.city || ""}
            options={[
              { value: "", label: "Choose a city" },
              ...cities.map((city) => ({ value: String(city.id), label: city.name })),
            ]}
          />
          <Field label="Total rooms" name="totalRooms" defaultValue="0" hint="Caps the rooms-per-night input on the venue page." />
          <label className="vw-check">
            <input type="checkbox" name="published" defaultChecked />
            <span>Show in the hotel dropdown</span>
          </label>
          <SubmitButton icon="plus">Add hotel</SubmitButton>
        </form>
      </Card>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="All hotels" icon="venue" />
          <form className="vw-card-pad" style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="row gx-2" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px" }}>
                <LiveSearch name="q" defaultValue={query} placeholder="Hotel name" label="Search hotels" />
              </div>
              <div style={{ flex: "0 1 220px" }}>
                <Select
                  label="Filter by city"
                  name="city"
                  srOnlyLabel
                  defaultValue={params.city || ""}
                  options={[
                    { value: "", label: "Every city" },
                    ...cities.map((city) => ({ value: String(city.id), label: city.name })),
                  ]}
                />
              </div>
              <SubmitButton size="sm" variant="secondary" icon="search">Filter</SubmitButton>
            </div>
          </form>

          {hotels.length === 0 ? (
            <EmptyState icon="venue" title="No hotels match">Clear the filters, or add one above.</EmptyState>
          ) : (
            <>
              <form id={CALC_HOTELS_BULK_FORM} className="vw-card-pad pb-0">
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
                      <th style={{ width: "2.25rem" }}><span className="sr-only">Select</span></th>
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
                          <td><RowCheckbox id={hotel.id} label={hotel.name} form={CALC_HOTELS_BULK_FORM} /></td>
                          <td>
                            <Link href={`/admin/calculator/hotels/${hotel.id}`} className="fw-600">{hotel.name}</Link>
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
                          <td>{hotel.published === 1 ? <Badge tone="ok">shown</Badge> : <Badge tone="neutral">hidden</Badge>}</td>
                          <td className="text-end">
                            <LinkButton href={`/admin/calculator/hotels/${hotel.id}`} size="sm" variant="secondary" icon="edit">
                              Edit
                            </LinkButton>
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
            <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)", display: "flex", gap: "0.5rem" }}>
              {page > 1 ? <LinkButton href={keep({ page: String(page - 1) })} size="sm" variant="secondary">Previous</LinkButton> : null}
              <span className="vw-hint">Page {page} of {pages}</span>
              {page < pages ? <LinkButton href={keep({ page: String(page + 1) })} size="sm" variant="secondary">Next</LinkButton> : null}
            </div>
          ) : null}
        </Card>
      </div>
    </AdminShell>
  );
}
