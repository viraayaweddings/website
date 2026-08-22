// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import {
  calculatorCities,
  calculatorCurrencies,
  calculatorHotels,
  calculatorPrices,
} from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { SubmitButton } from "../_components/FormControls";
import { Alert, Badge, Card, CardHead, EmptyState, Field, LinkButton, formatCount } from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";
import {
  bulkDeleteCalculatorCitiesAction,
  bulkDeleteCurrenciesAction,
  deleteCalculatorCityAction,
  deleteCurrencyAction,
  importCalculatorDataAction,
  saveCalculatorCityAction,
  saveCurrencyAction,
} from "./actions";

const CALC_CITIES_BULK_FORM = "calculator-cities-bulk-form";
const CALC_CURRENCIES_BULK_FORM = "calculator-currencies-bulk-form";

export default async function CalculatorAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/calculator", "calculator data");
  const db = await requireDb();
  const params = await searchParams;

  const [cities, currencies, hotelCounts, priceCount] = await Promise.all([
    db.select().from(calculatorCities).orderBy(asc(calculatorCities.position), asc(calculatorCities.name)),
    db.select().from(calculatorCurrencies).orderBy(asc(calculatorCurrencies.position), asc(calculatorCurrencies.code)),
    db
      .select({ cityId: calculatorHotels.cityId, total: sql<number>`count(*)` })
      .from(calculatorHotels)
      .groupBy(calculatorHotels.cityId),
    db.select({ total: sql<number>`count(*)` }).from(calculatorPrices),
  ]);

  const hotelsPerCity = new Map(hotelCounts.map((row) => [row.cityId, Number(row.total)]));
  const totalHotels = [...hotelsPerCity.values()].reduce((sum, value) => sum + value, 0);
  const totalPrices = Number(priceCount[0]?.total ?? 0);
  const empty = cities.length === 0 && totalHotels === 0;

  return (
    <AdminShell
      user={user}
      title="Cost calculator"
      subtitle={
        empty
          ? "No calculator data yet. Import the set the site shipped with to get started."
          : `${cities.length} cities, ${formatCount(totalHotels)} hotels and ${formatCount(totalPrices)} monthly prices. Edits are live within a minute.`
      }
      actions={
        <LinkButton href="/admin/calculator/hotels" icon="grid" variant="primary">
          Hotels &amp; prices
        </LinkButton>
      }
    >
      {params.error ? (
        <div className="mb-4">
          <Alert tone="error" title="That did not save">{params.error}</Alert>
        </div>
      ) : null}
      {params.saved ? (
        <div className="mb-4">
          <Alert tone="success" title="Saved">{params.saved}</Alert>
        </div>
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
              <SubmitButton icon="check">Import calculator data</SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="Cities" icon="city" hint="What the city dropdown offers" />
          {cities.length === 0 ? (
            <EmptyState icon="city" title="No cities yet">Add one below.</EmptyState>
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
                      <th style={{ width: "2.25rem" }}><span className="sr-only">Select</span></th>
                      <th>City</th>
                      <th>Hotels</th>
                      <th>Shown</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.map((city) => (
                      <tr key={city.id}>
                        <td><RowCheckbox id={city.id} label={city.name} form={CALC_CITIES_BULK_FORM} /></td>
                        <td>
                          <span className="fw-600">{city.name}</span>
                          <span className="vw-hint vw-mono"> #{city.id}</span>
                        </td>
                        <td>
                          <Link href={`/admin/calculator/hotels?city=${city.id}`}>
                            {formatCount(hotelsPerCity.get(city.id) ?? 0)}
                          </Link>
                        </td>
                        <td>
                          {city.published === 1 ? <Badge tone="ok">shown</Badge> : <Badge tone="neutral">hidden</Badge>}
                        </td>
                        <td className="text-end">
                          <details>
                            <summary className="vw-btn vw-btn-secondary vw-btn-sm">Edit</summary>
                            <form action={saveCalculatorCityAction} className="mt-2 space-y-2 text-start">
                              <input type="hidden" name="id" value={city.id} />
                              <Field label="Name" name="name" defaultValue={city.name} />
                              <Field label="Order" name="position" defaultValue={String(city.position)} />
                              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                                <input type="checkbox" name="published" className="vw-check" defaultChecked={city.published === 1} />
                                <span>Show in the city dropdown</span>
                              </label>
                              <SubmitButton size="sm" icon="check">Save city</SubmitButton>
                            </form>
                            <form action={deleteCalculatorCityAction} className="mt-2 text-start">
                              <input type="hidden" name="id" value={city.id} />
                              <SubmitButton
                                size="sm"
                                variant="danger-quiet"
                                icon="trash"
                                confirm={`Delete ${city.name}? Its hotels must be moved or deleted first.`}
                              >
                                Delete
                              </SubmitButton>
                            </form>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
            <form action={saveCalculatorCityAction} className="space-y-2">
              <Field label="Add a city" name="name" placeholder="e.g. Coorg" />
              <SubmitButton size="sm" icon="plus">Add city</SubmitButton>
            </form>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="Currencies" icon="grid" hint="What the currency switcher offers" />
          {currencies.length === 0 ? (
            <EmptyState icon="grid" title="No currencies yet">Add at least one; the calculator prices in it.</EmptyState>
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
                    <th style={{ width: "2.25rem" }}><span className="sr-only">Select</span></th>
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
                      <td><RowCheckbox id={currency.code} label={currency.code} form={CALC_CURRENCIES_BULK_FORM} /></td>
                      <td className="vw-mono">{currency.code}</td>
                      <td>{currency.name}</td>
                      <td>{currency.symbol}</td>
                      <td className="vw-mono">{currency.rateToUsd}</td>
                      <td>{currency.isDefault === 1 ? <Badge tone="ok">default</Badge> : null}</td>
                      <td className="text-end">
                        <details>
                          <summary className="vw-btn vw-btn-secondary vw-btn-sm">Edit</summary>
                          <form action={saveCurrencyAction} className="mt-2 space-y-2 text-start">
                            <input type="hidden" name="code" value={currency.code} />
                            <Field label="Name" name="currencyName" defaultValue={currency.name} />
                            <Field label="Symbol" name="symbol" defaultValue={currency.symbol} />
                            <Field label="Units per USD" name="rateToUsd" defaultValue={currency.rateToUsd} />
                            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                              <input type="checkbox" name="isDefault" className="vw-check" defaultChecked={currency.isDefault === 1} />
                              <span>Use as the default</span>
                            </label>
                            <SubmitButton size="sm" icon="check">Save currency</SubmitButton>
                          </form>
                          <form action={deleteCurrencyAction} className="mt-2 text-start">
                            <input type="hidden" name="code" value={currency.code} />
                            <SubmitButton
                              size="sm"
                              variant="danger-quiet"
                              icon="trash"
                              confirm={`Remove ${currency.code} from the switcher?`}
                            >
                              Delete
                            </SubmitButton>
                          </form>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          <div className="vw-card-pad" style={{ borderTop: "1px solid var(--line)" }}>
            <form action={saveCurrencyAction} className="space-y-2">
              <Field label="Code" name="code" placeholder="USD" hint="Three letters." />
              <Field label="Name" name="currencyName" placeholder="US Dollar" />
              <Field label="Symbol" name="symbol" placeholder="$" />
              <Field label="Units per USD" name="rateToUsd" placeholder="1" hint="How many of this currency one USD buys. INR is about 94." />
              <SubmitButton size="sm" icon="plus">Add currency</SubmitButton>
            </form>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
