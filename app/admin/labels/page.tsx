// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { LABEL_DEFINITIONS, readLabels } from "@/worker/site/labels";
import { AdminShell } from "../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../_components/FormControls";
import { Alert, Card, CardHead, Field } from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";
import { saveLabelsAction } from "./actions";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/labels", "site labels");
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const labels = await readLabels(db);

  // Grouped so the form reads like the pages it affects.
  const groups = [...new Set(LABEL_DEFINITIONS.map((definition) => definition.where))];

  return (
    <AdminShell
      user={user}
      title="Section headings"
      subtitle={`${LABEL_DEFINITIONS.length} pieces of fixed wording, across ${groups.length} areas of the site.`}
    >
      <div className="mb-4">
        <Alert tone="info" title="Wording, not content">
          These are the fixed words on the pages rather than the content itself. Where a heading has a bolded
          second half — &ldquo;Hotel <strong>Amenities</strong>&rdquo; — the two parts are edited separately so
          the styling survives. Leave the bolded part blank for a plain heading.
        </Alert>
      </div>

      <form action={saveLabelsAction} className="space-y-4">
        <UnsavedGuard />

        {groups.map((group) => (
          <Card key={group} pad={false}>
            <CardHead title={group} icon="type" />
            <div className="vw-card-pad space-y-4">
              {LABEL_DEFINITIONS.filter((definition) => definition.where === group).map((definition) => {
                const current = labels.get(definition.key);
                const isHeading = Boolean(definition.emphasis);

                return (
                  <div key={definition.key} className={`grid gap-3 ${isHeading ? "sm:grid-cols-2" : ""}`}>
                    <Field
                      label={definition.title}
                      name={`value_${definition.key}`}
                      defaultValue={current?.value ?? definition.value}
                      required
                    />
                    {isHeading ? (
                      <Field
                        label="Bolded part"
                        name={`emphasis_${definition.key}`}
                        defaultValue={current?.emphasis ?? definition.emphasis}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="vw-actionbar">
          <SubmitButton icon="check">Save headings</SubmitButton>
          <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
            Pages update within a minute.
          </span>
        </div>
      </form>
    </AdminShell>
  );
}
