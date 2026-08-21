// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { cityListings, cityPages, hotels } from "@/worker/db/schema";
import { AdminShell } from "../../_components/AdminShell";
import { CopyButton, SubmitButton, UnsavedGuard } from "../../_components/FormControls";
import { Alert, Badge, Card, CardHead, Field, LinkButton, TextArea } from "../../_components/ui";
import { requireDb, requireRole } from "../../_lib/auth";
import { saveCityAction } from "../actions";

export default async function EditCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { city } = await params;
  if (!/^[a-z0-9-]+$/i.test(city)) notFound();

  const user = await requireRole("admin", `/admin/cities/${city}`);
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const page = (await db.select().from(cityPages).where(eq(cityPages.city, city)).limit(1))[0];
  if (!page) notFound();

  const [listing, available] = await Promise.all([
    db.select().from(cityListings).where(eq(cityListings.city, city)).orderBy(asc(cityListings.position)),
    db
      .select({ city: hotels.city, slug: hotels.slug, name: hotels.name })
      .from(hotels)
      .where(eq(hotels.city, city))
      .orderBy(asc(hotels.name)),
  ]);

  // A venue in this city is written as a bare slug; anything else is qualified.
  const current = listing.map((row) =>
    row.venueCity === city ? row.venueSlug : `${row.venueCity}/${row.venueSlug}`,
  );
  const listedSet = new Set(listing.map((row) => `${row.venueCity}/${row.venueSlug}`));

  return (
    <AdminShell
      user={user}
      title={`${city} city page`}
      subtitle={`/destination-wedding/${city}/ · ${current.length} venue${current.length === 1 ? "" : "s"} listed, ${available.length} available in this city`}
      actions={
        <>
          <LinkButton href={`/destination-wedding/${city}/`} icon="external" variant="secondary" external>
            View
          </LinkButton>
          <LinkButton href="/admin/cities" icon="chevronLeft" variant="ghost">
            Back
          </LinkButton>
        </>
      }
    >
      <form action={saveCityAction} className="grid gap-4 lg:grid-cols-3">
        <UnsavedGuard />
        <input type="hidden" name="city" value={city} />

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card pad={false}>
            <CardHead
              title="Venues shown on this page"
              hint="One per line, in display order. Twelve are shown at a time."
              icon="venue"
            />
            <div className="vw-card-pad">
              <TextArea
                label="Venues"
                srOnlyLabel
                name="venues"
                rows={16}
                defaultValue={current.join("\n")}
                mono
                hint="A bare slug means a venue in this city; write other-city/slug to include one from elsewhere."
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card pad={false}>
            <CardHead title="Page details" icon="settings" />
            <div className="vw-card-pad space-y-3">
              <Field label="Title tag" name="seoTitle" defaultValue={page.seoTitle} required />
              <TextArea label="Meta description" name="metaDescription" rows={3} defaultValue={page.metaDescription} />
              <Field
                label="City ID"
                name="cityId"
                defaultValue={page.cityId}
                hint="Used by the venue filter and the pager links."
              />
              <Field
                label="Total venues"
                name="totalVenues"
                defaultValue={String(page.totalVenues)}
                hint="Sets the results count and how many pages the pager offers."
              />
            </div>
          </Card>

          <div className="vw-actionbar">
            <SubmitButton icon="check">Save city page</SubmitButton>
          </div>
        </div>
      </form>

      <Card className="mt-4" pad={false}>
        <CardHead
          title={`Venues in ${city}`}
          hint="Click a slug to copy it into the list above"
          icon="grid"
        />
        {available.length === 0 ? (
          <div className="vw-card-pad">
            <Alert tone="warning">No venues are recorded for this city yet.</Alert>
          </div>
        ) : (
          <ul className="vw-divide max-h-96 overflow-y-auto">
            {available.map((venue) => {
              const listedHere = listedSet.has(`${venue.city}/${venue.slug}`);
              return (
                <li key={venue.slug} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={{ color: listedHere ? "var(--ink)" : "var(--ink-faint)" }}>
                      {venue.name || venue.slug}
                    </span>
                    <span className="vw-mono block truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                      {venue.slug}
                    </span>
                  </span>
                  {listedHere ? <Badge tone="ok">listed</Badge> : <Badge tone="neutral">not listed</Badge>}
                  <CopyButton value={venue.slug} label="slug" />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </AdminShell>
  );
}
