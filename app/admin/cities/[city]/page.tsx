// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { cityListings, cityPages, hotels } from "@/worker/db/schema";
import { AdminShell } from "../../_components/AdminShell";
import { CopyButton, SubmitButton, UnsavedGuard, VersionField } from "../../_components/FormControls";
import { Alert, Badge, Card, CardHead, Field, LinkButton, StatusBadge, TextArea } from "../../_components/ui";
import { versionOf } from "../../_lib/concurrency";
import { requireDb, requireRole } from "../../_lib/auth";
import { deleteCityAction, saveCityAction, syncCityTotalAction } from "../actions";

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
      .select({ city: hotels.city, slug: hotels.slug, name: hotels.name, status: hotels.status })
      .from(hotels)
      .where(eq(hotels.city, city))
      .orderBy(asc(hotels.name)),
  ]);

  const publishedCount = available.filter((venue) => venue.status === "published").length;

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
          <StatusBadge status={page.published === 1 ? "published" : "draft"} />
          {/* A hidden page serves the markup it shipped with, so previewing is
              the only way to see the stored version before showing it. */}
          <LinkButton
            href={page.published === 1 ? `/destination-wedding/${city}/` : `/destination-wedding/${city}/?preview=1`}
            icon={page.published === 1 ? "external" : "eye"}
            variant="secondary"
            external
          >
            {page.published === 1 ? "View" : "Preview hidden page"}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Heading"
                  name="heading"
                  defaultValue={page.heading}
                  hint="Leave both halves empty to keep the wording the page ships with."
                />
                <Field
                  label="Emphasised half"
                  name="headingEmphasis"
                  defaultValue={page.headingEmphasis}
                  hint="Printed in the accent colour after the plain half."
                />
              </div>
              <Field
                label="City ID"
                name="cityId"
                defaultValue={page.cityId}
                hint="The number the venue filter and pager links use."
              />
              <Field
                label="Total venues"
                name="totalVenues"
                defaultValue={String(page.totalVenues)}
                hint={`Sets the results count and how many pages the pager offers. ${available.length} venue${available.length === 1 ? " is" : "s are"} recorded for this city.`}
              />
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                <input
                  type="checkbox"
                  name="published"
                  className="vw-check"
                  defaultChecked={page.published === 1}
                />
                <span>Serve this stored version</span>
              </label>
            </div>
          </Card>

          <div className="vw-actionbar">
            <SubmitButton icon="check">Save city page</SubmitButton>
          </div>
        </div>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <CardHead title="Match the total to the venues" icon="refresh" />
          <form action={syncCityTotalAction} className="vw-card-pad">
            <input type="hidden" name="city" value={city} />
            <p className="vw-hint mb-3">
              The stored total is {page.totalVenues}; {publishedCount} published venue
              {publishedCount === 1 ? " is" : "s are"} recorded for {city}. Setting them equal keeps the results
              line and the pager honest.
            </p>
            <SubmitButton variant="secondary" icon="refresh" pendingLabel="Updating…">
              Set total to {publishedCount}
            </SubmitButton>
          </form>
        </Card>

        <Card pad={false}>
          <CardHead title="Danger zone" icon="warning" />
          <div className="vw-card-pad">
            <p className="mb-3 text-sm" style={{ color: "var(--ink-soft)" }}>
              Deleting removes this page and the venue list that belongs to it. The venues keep their own pages
              and stay listed anywhere else they appear. Untick &ldquo;Serve this stored version&rdquo; above for
              the same effect without losing the list.
            </p>
            <form action={deleteCityAction}>
              <input type="hidden" name="id" value={city} />
              <VersionField value={versionOf(page)} />
              <SubmitButton
                variant="danger-quiet"
                icon="trash"
                pendingLabel="Deleting…"
                confirm={`Delete the ${city} city page and its venue list?`}
              >
                Delete city page
              </SubmitButton>
            </form>
          </div>
        </Card>
      </div>

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
                  {venue.status === "published" ? null : <Badge tone="warn">draft</Badge>}
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
