// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { sql } from "drizzle-orm";
import { hotels } from "@/worker/db/schema";
import { readSettings } from "@/worker/site/settings";
import { AdminShell } from "../_components/AdminShell";
import { CsrfField } from "../_components/CsrfField";
import { SubmitButton, UnsavedGuard } from "../_components/FormControls";
import { Alert, Card, CardHead, DetailList, Field, TextArea } from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";
import { saveSettingsAction } from "./actions";
import { importSiteContentAction } from "./seed-actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/settings", "site settings");
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const { values, hasStoredValues } = await readSettings(db);
  const venueCount = Number(
    (await db.select({ total: sql<number>`count(*)` }).from(hotels))[0]?.total ?? 0,
  );

  return (
    <AdminShell
      user={user}
      title="Contact details"
      subtitle="One set of details, used everywhere the site shows a phone number, address or social link."
    >
      {venueCount === 0 ? (
        <div className="mb-4">
          <Card pad={false}>
            <CardHead title="Import site content" icon="download" />
            <div className="vw-card-pad space-y-3">
              <p className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                Postgres is connected but empty. Import venues, articles, hero slides, contact details and page
                templates from the legacy site export. Safe to run more than once.
              </p>
              <form action={importSiteContentAction}>
            <CsrfField />
                <SubmitButton icon="download" pendingLabel="Importing…">
                  Import site content
                </SubmitButton>
              </form>
            </div>
          </Card>
        </div>
      ) : null}

      {hasStoredValues ? null : (
        <div className="mb-4">
          <Alert tone="warning" title="Not stored yet">
            The pages are still showing the values built into them. Saving here takes over from those.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" pad={false}>
          <CardHead title="Details" icon="settings" />
          <form action={saveSettingsAction} className="vw-card-pad space-y-4">
            <CsrfField />
            <UnsavedGuard />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Phone"
                name="phone"
                defaultValue={values.phone}
                required
                hint="Shown on the contact page exactly as typed."
              />
              <Field
                label="WhatsApp number"
                name="whatsappNumber"
                defaultValue={values.whatsappNumber}
                required
                hint="Digits only, including country code."
              />
            </div>

            <Field label="Email" name="email" type="email" defaultValue={values.email} required />

            <TextArea
              label="Address"
              name="address"
              rows={3}
              defaultValue={values.addressLines.join("\n")}
              hint="One line per row."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram URL" name="instagramUrl" defaultValue={values.instagramUrl} required />
              <Field label="LinkedIn URL" name="linkedinUrl" defaultValue={values.linkedinUrl} required />
            </div>

            <div className="vw-actionbar">
              <SubmitButton icon="check">Save contact details</SubmitButton>
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Pages update within a minute.
              </span>
            </div>
          </form>
        </Card>

        <Card className="h-fit" pad={false}>
          <CardHead title="Where these appear" icon="info" />
          <div className="vw-card-pad">
            <DetailList
              rows={[
                { label: "Phone, email, address", value: "The contact page." },
                { label: "WhatsApp", value: "The floating button on every page." },
                { label: "Instagram, LinkedIn", value: "The footer, site-wide." },
              ]}
            />
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
