// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  CALCULATOR_MONTHS,
  calculatorCities,
  calculatorHotels,
  calculatorPrices,
} from "@/worker/db/schema";
import { AdminShell } from "../../../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../../../_components/FormControls";
import { Alert, Card, CardHead, Field, LinkButton, Select } from "../../../_components/ui";
import { requireDb, requireRole } from "../../../_lib/auth";
import { deleteCalculatorHotelAction, saveCalculatorHotelAction, saveCalculatorPricesAction } from "../../actions";

export default async function CalculatorHotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/calculator/hotels", "calculator data");
  const db = await requireDb();
  const { id } = await params;
  const query = await searchParams;

  const hotelId = Number.parseInt(id, 10);
  if (!Number.isInteger(hotelId)) notFound();

  const [hotelRows, cities, priceRows] = await Promise.all([
    db.select().from(calculatorHotels).where(eq(calculatorHotels.id, hotelId)).limit(1),
    db.select().from(calculatorCities).orderBy(asc(calculatorCities.name)),
    db.select().from(calculatorPrices).where(eq(calculatorPrices.hotelId, hotelId)),
  ]);

  const hotel = hotelRows[0];
  if (!hotel) notFound();

  const byMonth = new Map(priceRows.map((row) => [row.month, row]));

  return (
    <AdminShell
      user={user}
      title={hotel.name}
      subtitle={`Calculator hotel #${hotel.id}. The venue page for this hotel prices from these figures.`}
      actions={<LinkButton href="/admin/calculator/hotels" icon="chevronLeft" variant="secondary">All hotels</LinkButton>}
    >
      {query.error ? (
        <div className="mb-4"><Alert tone="error" title="That did not save">{query.error}</Alert></div>
      ) : null}
      {query.saved ? (
        <div className="mb-4"><Alert tone="success" title="Saved">{query.saved}</Alert></div>
      ) : null}

      <Card pad={false}>
        <CardHead title="Details" icon="venue" />
        <form action={saveCalculatorHotelAction} className="vw-card-pad space-y-3">
          <UnsavedGuard />
          <input type="hidden" name="id" value={hotel.id} />
          <Field label="Name" name="name" defaultValue={hotel.name} required />
          <Select
            label="City"
            name="cityId"
            defaultValue={String(hotel.cityId)}
            options={[
              { value: "", label: "Choose a city" },
              ...cities.map((city) => ({ value: String(city.id), label: city.name })),
            ]}
          />
          <Field
            label="Total rooms"
            name="totalRooms"
            defaultValue={String(hotel.totalRooms)}
            hint="Caps the rooms-per-night input on the venue page."
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" name="published" className="vw-check" defaultChecked={hotel.published === 1} />
            <span>Show in the hotel dropdown</span>
          </label>
          <SubmitButton icon="check">Save details</SubmitButton>
        </form>
      </Card>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead
            title="Monthly prices"
            icon="grid"
            hint="Per room per night, and per person for meals"
          />
          <form action={saveCalculatorPricesAction} className="vw-card-pad">
            <UnsavedGuard />
            <input type="hidden" name="hotelId" value={hotel.id} />

            <div className="vw-table-wrap">
              <table className="vw-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Room</th>
                    <th>Lunch</th>
                    <th>Hi-Tea</th>
                    <th>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {CALCULATOR_MONTHS.map((month) => {
                    const row = byMonth.get(month);
                    return (
                      <tr key={month}>
                        <td className="fw-600">{month}</td>
                        <td>
                          <input className="vw-input vw-mono" name={`room_${month}`}
                            defaultValue={row?.roomPrice ?? "0.00"} inputMode="decimal"
                            aria-label={`Room price for ${month}`} />
                        </td>
                        <td>
                          <input className="vw-input vw-mono" name={`lunch_${month}`}
                            defaultValue={row?.lunchPrice ?? "0.00"} inputMode="decimal"
                            aria-label={`Lunch price for ${month}`} />
                        </td>
                        <td>
                          <input className="vw-input vw-mono" name={`hitea_${month}`}
                            defaultValue={row?.hiteaPrice ?? "0.00"} inputMode="decimal"
                            aria-label={`Hi-tea price for ${month}`} />
                        </td>
                        <td>
                          <input className="vw-input vw-mono" name={`dinner_${month}`}
                            defaultValue={row?.dinnerPrice ?? "0.00"} inputMode="decimal"
                            aria-label={`Dinner price for ${month}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="vw-hint mt-3">
              Figures are in rupees. The calculator multiplies the room price by rooms per night and each meal price
              by the number of guests, then adds 18% GST.
            </p>

            <div className="mt-3">
              <SubmitButton icon="check">Save all twelve months</SubmitButton>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="Delete" icon="trash" />
          <form action={deleteCalculatorHotelAction} className="vw-card-pad">
            <input type="hidden" name="id" value={hotel.id} />
            <p className="vw-hint mb-3">
              Removes the hotel and its twelve prices. The venue page for it stays online but will price at zero
              until the hotel is added back with the same id.
            </p>
            <SubmitButton
              variant="danger"
              icon="trash"
              confirm={`Delete ${hotel.name} and its prices?`}
            >
              Delete hotel
            </SubmitButton>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
