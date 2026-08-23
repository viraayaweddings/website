// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import {
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
  calculatorTaxes,
  hotels,
} from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
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
  formatCount,
} from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";
import {
  bulkDeleteCalculatorCitiesAction,
  bulkDeleteCalculatorTaxesAction,
  bulkDeleteCurrenciesAction,
  deleteCalculatorTaxAction,
  saveCalculatorTaxAction,
  deleteCalculatorCityAction,
  deleteCurrencyAction,
  importCalculatorDataAction,
  saveCalculatorCityAction,
  saveCurrencyAction,
} from "./actions";

const CALC_CITIES_BULK_FORM = "calculator-cities-bulk-form";
const CALC_CURRENCIES_BULK_FORM = "calculator-currencies-bulk-form";
const CALC_TAXES_BULK_FORM = "calculator-taxes-bulk-form";

/** Whitelisted so a crafted query string cannot pick an arbitrary comparator. */
const SORT_KEYS = ["order", "name", "hotels"] as const;
const SORT_LABELS: Record<string, string> = {
  order: "Picker order",
  name: "Name (A-Z)",
  hotels: "Most hotels first",
};

export default async function CalculatorAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("admin", "/admin/calculator", "calculator data");
  const db = await requireDb();
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "";

  const query = single(params.q).slice(0, 120).toLowerCase();
  const statusFilter =
    single(params.status) === "hidden" ? "hidden" : single(params.status) === "shown" ? "shown" : "";
  const sort = (SORT_KEYS as readonly string[]).includes(single(params.sort))
    ? (single(params.sort) as (typeof SORT_KEYS)[number])
    : "order";
  const editingCity = Number.parseInt(single(params.city) || "", 10);

  const [cities, currencies, taxes, hotelCounts, priceCount, unlinkedVenues] = await Promise.all([
    db.select().from(calculatorCities).orderBy(asc(calculatorCities.position), asc(calculatorCities.name)),
    db.select().from(calculatorCurrencies).orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code)),
    db.select().from(calculatorTaxes).orderBy(asc(calculatorTaxes.position), asc(calculatorTaxes.code)),
    db
      .select({ cityId: calculatorHotels.cityId, total: sql<number>`count(*)` })
      .from(calculatorHotels)
      .groupBy(calculatorHotels.cityId),
    db.select({ total: sql<number>`count(*)` }).from(calculatorPrices),
    // Venue pages whose calculator points at nothing. Their cost calculator
    // renders, prices every line at zero and totals to zero, and nothing on the
    // page says so -- this is the only place it is visible.
    db
      .select({ city: hotels.city, slug: hotels.slug, hotelId: hotels.externalHotelId })
      .from(hotels)
      .where(
        sql`${hotels.status} = 'published' and (
          ${hotels.externalHotelId} = ''
          or not exists (select 1 from calculator_hotels c where c.id::text = ${hotels.externalHotelId})
        )`,
      )
      .orderBy(asc(hotels.city), asc(hotels.slug))
      .limit(20),
  ]);

  const hotelsPerCity = new Map(hotelCounts.map((row) => [row.cityId, Number(row.total)]));
  const totalHotels = [...hotelsPerCity.values()].reduce((sum, value) => sum + value, 0);
  const totalPrices = Number(priceCount[0]?.total ?? 0);
  const empty = cities.length === 0 && totalHotels === 0;
  const shownCities = cities.filter((city) => city.published === 1).length;
  const defaultCurrency = currencies.find((currency) => currency.isDefault === 1);
  const liveTaxes = taxes.filter((tax) => tax.published === 1);
  const taxTotal = liveTaxes.reduce((sum, tax) => sum + (Number(tax.percent) || 0), 0);
  const taxPercent = (value: string) => String(Math.round((Number(value) || 0) * 100) / 100);

  const visibleCities = cities
    .filter((city) => {
      if (statusFilter === "shown" && city.published !== 1) return false;
      if (statusFilter === "hidden" && city.published === 1) return false;
      if (!query) return true;
      return city.name.toLowerCase().includes(query) || String(city.id) === query;
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "hotels") {
        return (hotelsPerCity.get(b.id) ?? 0) - (hotelsPerCity.get(a.id) ?? 0) || a.name.localeCompare(b.name);
      }
      return a.position - b.position || a.name.localeCompare(b.name);
    });

  const filtered = Boolean(query || statusFilter || sort !== "order");

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, status: statusFilter, sort, city: "", ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.status) search.set("status", String(merged.status));
    if (merged.sort && merged.sort !== "order") search.set("sort", String(merged.sort));
    if (merged.city) search.set("city", String(merged.city));
    const string = search.toString();
    return `/admin/calculator${string ? `?${string}` : ""}`;
  };

  return (
    <AdminShell
      user={user}
      title="Cost calculator"
      subtitle={
        empty
          ? "No calculator data yet. Import the set the site shipped with to get started."
          : `${shownCities} of ${cities.length} cities shown, ${formatCount(totalHotels)} hotels and ${formatCount(totalPrices)} monthly prices. Edits are live within a minute.`
      }
      actions={
        <LinkButton href="/admin/calculator/hotels" icon="grid" variant="primary">
          Hotels &amp; prices
        </LinkButton>
      }
    >
      {unlinkedVenues.length > 0 ? (
        <Alert tone="error" title={`${unlinkedVenues.length} venue page(s) not linked to the calculator`}>
          Their cost calculator prices every line at zero and totals to zero, with nothing on the page to
          say so. Give each one a hotel here, then set its Hotel ID on the venue.
          <ul className="mt-2 space-y-1">
            {unlinkedVenues.map((venue) => (
              <li key={`${venue.city}/${venue.slug}`} className="vw-mono text-xs">
                <Link href={`/destination-wedding/${venue.city}/${venue.slug}`} style={{ textDecoration: "underline" }}>
                  /{venue.city}/{venue.slug}
                </Link>{" "}
                {venue.hotelId ? `→ hotel ${venue.hotelId} does not exist here` : "→ no hotel id"}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {empty ? (
        <Card pad={false}>
          <CardHead title="Import the shipped data" icon="grid" />
          <div className="vw-card-pad space-y-3">
            <p className="vw-hint">
              The calculator used to price from a file inside the build. Importing copies those cities, hotels and
              prices into the database, after which this panel owns them and the file is no longer read.
            </p>
            <form action={importCalculatorDataAction}>
              <SubmitButton icon="check" pendingLabel="Importing…">
                Import calculator data
              </SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}

      {!empty && !defaultCurrency ? (
        <div className="mb-4">
          <Alert tone="warning" title="No default currency">
            The switcher opens on the default. With none set, the calculator prices in whatever the page happens
            to hold. Tick &ldquo;Use as the default&rdquo; on one below.
          </Alert>
        </div>
      ) : null}

      <div className="mt-4">
        <Card pad={false}>
          <CardHead
            title="Cities"
            icon="city"
            hint={`What the city dropdown offers · ${visibleCities.length} shown`}
          />

          <form method="get" className="vw-card-pad" style={{ borderBottom: "1px solid var(--line)" }}>
            <AutoSubmitControls />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
              <div>
                <span className="vw-label">Search</span>
                <LiveSearch name="q" defaultValue={query} placeholder="City name or id" label="Search cities" />
              </div>
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
              <div className="mt-3 flex justify-end">
                <LinkButton href="/admin/calculator" variant="ghost" size="sm" icon="close">
                  Reset filters
                </LinkButton>
              </div>
            ) : null}
          </form>

          {visibleCities.length === 0 ? (
            <EmptyState icon="city" title={filtered ? "No cities match these filters" : "No cities yet"}>
              {filtered ? "Try a different search term or status." : "Add one below."}
            </EmptyState>
          ) : (
            <>
              <form id={CALC_CITIES_BULK_FORM} className="vw-card-pad pb-0">
                <BulkSelection noun="city" formId={CALC_CITIES_BULK_FORM}>
                  <SubmitButton
                    size="sm"
                    variant="danger-quiet"
                    icon="trash"
                    pendingLabel="Deleting…"
                    formAction={bulkDeleteCalculatorCitiesAction}
                    confirm="Delete every selected city? Their hotels must be moved or deleted first."
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
                      <th>City</th>
                      <th>Hotels</th>
                      <th>Order</th>
                      <th>Shown</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCities.map((city) => {
                      const open = editingCity === city.id;
                      return (
                        <tr key={city.id}>
                          <td>
                            <RowCheckbox id={city.id} label={city.name} form={CALC_CITIES_BULK_FORM} />
                          </td>
                          <td>
                            {open ? (
                              // The edit form lives in the row so the city it
                              // belongs to stays in front of the reader.
                              <form action={saveCalculatorCityAction} className="space-y-2">
                                <input type="hidden" name="id" value={city.id} />
                                <Field label="Name" name="name" defaultValue={city.name} required />
                                <Field label="Order" name="position" defaultValue={String(city.position)} />
                                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                                  <input
                                    type="checkbox"
                                    name="published"
                                    className="vw-check"
                                    defaultChecked={city.published === 1}
                                  />
                                  <span>Show in the city dropdown</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <SubmitButton size="sm" icon="check">
                                    Save city
                                  </SubmitButton>
                                  <LinkButton href={href({ city: "" })} size="sm" variant="ghost" icon="close">
                                    Cancel
                                  </LinkButton>
                                </div>
                              </form>
                            ) : (
                              <>
                                <span className="font-semibold">{city.name}</span>
                                <span className="vw-hint vw-mono"> #{city.id}</span>
                              </>
                            )}
                          </td>
                          <td>
                            <Link href={`/admin/calculator/hotels?city=${city.id}`} className="vw-link">
                              {formatCount(hotelsPerCity.get(city.id) ?? 0)}
                            </Link>
                          </td>
                          <td className="tabular-nums" style={{ color: "var(--ink-soft)" }}>
                            {city.position}
                          </td>
                          <td>
                            {city.published === 1 ? <Badge tone="ok">shown</Badge> : <Badge tone="neutral">hidden</Badge>}
                          </td>
                          <td className="text-end">
                            <div className="flex justify-end gap-1">
                              {open ? null : (
                                <LinkButton href={href({ city: city.id })} size="sm" variant="secondary" icon="edit">
                                  Edit
                                </LinkButton>
                              )}
                              <form action={deleteCalculatorCityAction}>
                                <input type="hidden" name="id" value={city.id} />
                                <SubmitButton
                                  size="sm"
                                  variant="danger-quiet"
                                  icon="trash"
                                  label={`Delete ${city.name}`}
                                  pendingLabel="Deleting…"
                                  confirm={`Delete ${city.name}? Its hotels must be moved or deleted first.`}
                                >
                                  {""}
                                </SubmitButton>
                              </form>
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

          <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
            <form action={saveCalculatorCityAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <Field label="Add a city" name="name" placeholder="e.g. Coorg" required />
              <Field label="Order" name="position" defaultValue="0" hint="Lower numbers come first." />
              <SubmitButton size="sm" icon="plus" pendingLabel="Adding…">
                Add city
              </SubmitButton>
            </form>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead
            title="Tax rates"
            icon="grid"
            hint={
              liveTaxes.length
                ? `Every calculator adds ${taxPercent(String(taxTotal))}% to the subtotal`
                : "No tax is being added to any quote"
            }
          />
          <div className="vw-card-pad" style={{ borderBottom: "1px solid var(--line)" }}>
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Each published line becomes one row on every cost summary, in order, and the total is the
              subtotal plus all of them. All five calculators read these rates &mdash; the venue pages, the
              home page, /hotel-cost-calculator, the city landing pages and /compare-hotel.
            </p>
            {liveTaxes.length === 0 ? (
              <Alert tone="warning" title="No tax on any quote">
                Nothing is published, so every quote on the site shows its subtotal as the total. Add a line,
                or leave it if that is intended.
              </Alert>
            ) : null}
          </div>
          {taxes.length === 0 ? (
            <EmptyState icon="grid" title="No tax lines yet">
              Add one; the calculators show the subtotal as the total until you do.
            </EmptyState>
          ) : (
            <>
              <form id={CALC_TAXES_BULK_FORM} className="vw-card-pad pb-0">
                <BulkSelection noun="tax line" formId={CALC_TAXES_BULK_FORM}>
                  <SubmitButton
                    size="sm"
                    variant="danger-quiet"
                    icon="trash"
                    pendingLabel="Deleting…"
                    formAction={bulkDeleteCalculatorTaxesAction}
                    confirm="Delete every selected tax line? Quotes across the site will drop it immediately."
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
                      <th>Code</th>
                      <th>Label</th>
                      <th>Rate</th>
                      <th>Shown</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxes.map((tax) => (
                      <tr key={tax.code}>
                        <td>
                          <RowCheckbox id={tax.code} label={tax.label} form={CALC_TAXES_BULK_FORM} />
                        </td>
                        <td className="vw-mono">{tax.code}</td>
                        <td>{tax.label}</td>
                        <td className="vw-mono">{taxPercent(tax.percent)}%</td>
                        <td>
                          {tax.published === 1 ? (
                            <Badge tone="ok">shown</Badge>
                          ) : (
                            <Badge tone="neutral">hidden</Badge>
                          )}
                        </td>
                        <td className="text-end">
                          <form
                            action={saveCalculatorTaxAction}
                            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
                          >
                            <input type="hidden" name="code" value={tax.code} />
                            <Field label="Label" name="label" defaultValue={tax.label} required />
                            <Field label="Rate %" name="percent" defaultValue={taxPercent(tax.percent)} required />
                            <Field label="Order" name="position" defaultValue={String(tax.position)} />
                            <div className="space-y-2 text-start">
                              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                                <input
                                  type="checkbox"
                                  name="published"
                                  className="vw-check"
                                  defaultChecked={tax.published === 1}
                                />
                                <span>Shown</span>
                              </label>
                              <SubmitButton size="sm" icon="check">
                                Save
                              </SubmitButton>
                            </div>
                          </form>
                          <form action={deleteCalculatorTaxAction} className="mt-2 flex justify-end">
                            <input type="hidden" name="code" value={tax.code} />
                            <SubmitButton
                              size="sm"
                              variant="danger-quiet"
                              icon="trash"
                              pendingLabel="Removing…"
                              confirm={`Remove ${tax.label} from every cost summary?`}
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
            </>
          )}

          <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
            <form action={saveCalculatorTaxAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <Field label="Code" name="code" placeholder="igst" required hint="Short key, letters and digits." />
              <Field label="Label" name="label" placeholder="IGST" required hint="Shown on the cost summary." />
              <Field label="Rate %" name="percent" placeholder="18" required />
              <Field label="Order" name="position" placeholder="2" />
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                  <input type="checkbox" name="published" className="vw-check" defaultChecked />
                  <span>Shown on quotes</span>
                </label>
                <SubmitButton size="sm" icon="plus" pendingLabel="Adding…">
                  Add tax line
                </SubmitButton>
              </div>
            </form>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="Currencies" icon="grid" hint="What the currency switcher offers" />
          {currencies.length === 0 ? (
            <EmptyState icon="grid" title="No currencies yet">
              Add at least one; the calculator prices in it.
            </EmptyState>
          ) : (
            <>
              <form id={CALC_CURRENCIES_BULK_FORM} className="vw-card-pad pb-0">
                <BulkSelection noun="currency" formId={CALC_CURRENCIES_BULK_FORM}>
                  <SubmitButton
                    size="sm"
                    variant="danger-quiet"
                    icon="trash"
                    pendingLabel="Deleting…"
                    formAction={bulkDeleteCurrenciesAction}
                    confirm="Delete every selected currency? At least one currency must remain."
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
                      <th>Code</th>
                      <th>Name</th>
                      <th>Symbol</th>
                      <th>Per USD</th>
                      <th>Default</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.map((currency) => (
                      <tr key={currency.code}>
                        <td>
                          <RowCheckbox id={currency.code} label={currency.code} form={CALC_CURRENCIES_BULK_FORM} />
                        </td>
                        <td className="vw-mono">{currency.code}</td>
                        <td>{currency.name}</td>
                        <td>{currency.symbol}</td>
                        <td className="vw-mono">{currency.rateToUsd}</td>
                        <td>{currency.isDefault === 1 ? <Badge tone="ok">default</Badge> : null}</td>
                        <td className="text-end">
                          <form
                            action={saveCurrencyAction}
                            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
                          >
                            <input type="hidden" name="code" value={currency.code} />
                            <Field label="Name" name="currencyName" defaultValue={currency.name} required />
                            <Field label="Symbol" name="symbol" defaultValue={currency.symbol} />
                            <Field label="Units per USD" name="rateToUsd" defaultValue={currency.rateToUsd} required />
                            <div className="space-y-2 text-start">
                              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                                <input
                                  type="checkbox"
                                  name="isDefault"
                                  className="vw-check"
                                  defaultChecked={currency.isDefault === 1}
                                />
                                <span>Default</span>
                              </label>
                              <SubmitButton size="sm" icon="check">
                                Save
                              </SubmitButton>
                            </div>
                          </form>
                          <form action={deleteCurrencyAction} className="mt-2 flex justify-end">
                            <input type="hidden" name="code" value={currency.code} />
                            <SubmitButton
                              size="sm"
                              variant="danger-quiet"
                              icon="trash"
                              pendingLabel="Removing…"
                              confirm={`Remove ${currency.code} from the switcher?`}
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
            </>
          )}

          <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
            <form action={saveCurrencyAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <Field label="Code" name="code" placeholder="USD" required hint="Three letters." />
              <Field label="Name" name="currencyName" placeholder="US Dollar" required />
              <Field label="Symbol" name="symbol" placeholder="$" />
              <Field
                label="Units per USD"
                name="rateToUsd"
                placeholder="1"
                required
                hint="How many of this currency one USD buys."
              />
              <div className="sm:col-span-2 lg:col-span-4">
                <SubmitButton size="sm" icon="plus" pendingLabel="Adding…">
                  Add currency
                </SubmitButton>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
