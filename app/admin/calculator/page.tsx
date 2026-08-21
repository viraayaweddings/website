// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { readCalculatorPriceOverrides } from "@/worker/site/calculator-prices";
import { AdminShell } from "../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../_components/FormControls";
import { Alert, Card, CardHead, TextArea } from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";
import { saveCalculatorPricesAction } from "./actions";

export default async function CalculatorAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/calculator", "calculator prices");
  const db = await requireDb();
  await searchParams;

  const overrides = await readCalculatorPriceOverrides(db);

  return (
    <AdminShell
      user={user}
      title="Calculator pricing"
      subtitle="Override hotel price tables without redeploying the site. Leave blank to use the bundled defaults."
    >
      <div className="mb-4">
        <Alert tone="info" title="Advanced JSON overrides">
          Paste a partial copy of the prices map: top-level keys are hotel ids, nested keys are month names. Only
          overridden hotels and months replace the bundled calculator data served at /data/calculator/prices.json.
        </Alert>
      </div>

      <Card pad={false}>
        <CardHead title="Price overrides" icon="grid" />
        <form action={saveCalculatorPricesAction} className="vw-card-pad space-y-4">
          <UnsavedGuard />
          <TextArea
            label="Calculator prices JSON"
            name="calculatorPrices"
            rows={18}
            defaultValue={overrides}
            mono
            hint="Clear the field and save to revert to bundled pricing."
          />
          <SubmitButton icon="check">Save pricing overrides</SubmitButton>
        </form>
      </Card>
    </AdminShell>
  );
}
