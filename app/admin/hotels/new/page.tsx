// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { hotels, POST_STATUSES } from "@/worker/db/schema";
import { AdminShell } from "../../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../../_components/FormControls";
import { MediaPicker } from "../../_components/MediaPicker";
import { RichText } from "../../_components/RichText";
import { Alert, Card, CardHead, Field, LinkButton, Select, TextArea } from "../../_components/ui";
import { requireDb, requireUser } from "../../_lib/auth";
import { createHotelAction } from "../actions";

const SPARE_ROWS = 2;

export default async function NewHotelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("/admin/hotels/new");
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const cities = await db.selectDistinct({ city: hotels.city }).from(hotels).orderBy(asc(hotels.city));

  return (
    <AdminShell
      user={user}
      title="New venue"
      subtitle="A new venue has no page of its own in the site files, so it borrows the layout of an existing one."
      actions={
        <LinkButton href="/admin/hotels" icon="chevronLeft" variant="ghost">
          Back to venues
        </LinkButton>
      }
    >
      <div className="mb-4">
        <Alert tone="info" title="Publish when you are ready">
          Leave the status as draft while you fill this in. A draft venue is not reachable on the site, and the
          nearby-venue strip and city listings are set up separately once it exists.
        </Alert>
      </div>

      <form action={createHotelAction} className="grid gap-4 lg:grid-cols-3">
        <UnsavedGuard />

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card pad={false}>
            <CardHead title="Overview" icon="venue" />
            <div className="vw-card-pad space-y-4">
              <Field label="Venue name" name="name" required />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="City"
                  name="city"
                  required
                  list="known-cities"
                  hint="Pick an existing city or type a new one."
                />
                <datalist id="known-cities">
                  {cities.map((row) => (
                    <option key={row.city} value={row.city} />
                  ))}
                </datalist>

                <Field
                  label="URL slug"
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Use lowercase letters, numbers, and hyphens only."
                  hint="Lowercase letters, numbers and hyphens only — for example taj-agra."
                />
              </div>

              <TextArea label="Address" name="address" rows={2} />

              <RichText
                label="Description"
                name="description"
                minHeight={320}
                placeholder="Describe the venue. Paste from a document, or drop an image straight in."
                hint="Shown under the venue name, behind the View More toggle."
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead
              title="Hotel highlights"
              hint="Clear a title to remove that highlight. Blank rows are ignored."
              icon="sparkle"
            />
            <div className="vw-card-pad space-y-3">
              {Array.from({ length: SPARE_ROWS }, (_, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-[10px] border p-3 sm:grid-cols-2"
                  style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  <Field label={`Title ${index + 1}`} name={`highlight_title_${index}`} />
                  <MediaPicker label="Picture" name={`highlight_image_${index}`} shape="card" />
                </div>
              ))}
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Nearby venues" hint={'The "Browse Similar Hotels" strip at the foot of the page'} icon="link" />
            <div className="vw-card-pad">
              <TextArea
                label="Venues"
                name="nearbySlugs"
                rows={5}
                mono
                hint="One per line as city/slug — for example agra/taj-agra. Leave empty to hide the strip."
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead
              title="Frequently asked questions"
              hint="Clear a question to remove it. Blank rows are ignored."
              icon="info"
            />
            <div className="vw-card-pad space-y-3">
              {Array.from({ length: SPARE_ROWS }, (_, index) => (
                <div
                  key={index}
                  className="rounded-[10px] border p-3"
                  style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  <input type="hidden" name={`faq_id_${index}`} value="" />
                  <Field label={`Question ${index + 1}`} name={`faq_question_${index}`} />
                  <div className="mt-2">
                    <RichText
                      label="Answer"
                      name={`faq_answer_${index}`}
                      minHeight={130}
                      placeholder="The answer shown when this question is opened."
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card pad={false}>
            <CardHead title="Publishing" icon="check" />
            <div className="vw-card-pad">
              <Select
                label="Status"
                name="status"
                defaultValue="draft"
                options={POST_STATUSES.map((status) => ({ value: status, label: status }))}
                hint="Drafts are hidden from the site."
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Banner" icon="image" />
            <div className="vw-card-pad">
              <MediaPicker label="Banner image" name="bannerImage" />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="At a glance" hint="Optional; can be filled in later" icon="bed" />
            <div className="vw-card-pad space-y-3">
              <Field label="Total room inventory" name="roomInventory" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Indoor venues" name="indoorVenues" />
                <Field label="Outdoor venues" name="outdoorVenues" />
                <Field label="Guest capacity" name="guestCapacity" />
                <Field label="Max. reception" name="receptionCapacity" />
                <Field label="From airport" name="airportTime" />
                <Field label="From station" name="stationTime" />
              </div>
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Search and social" icon="search" />
            <div className="vw-card-pad space-y-3">
              <Field label="Title tag" name="seoTitle" hint="Defaults to the venue name." />
              <TextArea label="Meta description" name="metaDescription" rows={3} />
              <TextArea label="Meta keywords" name="metaKeywords" rows={2} />
              <MediaPicker label="Social share image" name="ogImage" hint="Defaults to the banner if left empty." />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Listing card" icon="grid" />
            <div className="vw-card-pad space-y-3">
              <MediaPicker
                label="Thumbnail"
                name="thumbnailImage"
                shape="card"
                hint="Shown on city pages and nearby strips."
              />
              <Field label="Location" name="cityLabel" hint={'Full form, e.g. "Agra, India".'} />
              <Field label="Venue type" name="venueCategory" />
              <Field label="Guest figure on cards" name="cardPax" />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Booking identifiers" icon="link" />
            <div className="vw-card-pad space-y-3">
              <Field label="Hotel ID" name="externalHotelId" hint="Used by the enquiry form and cost calculator." />
              <Field label="Total rooms" name="totalRooms" />
            </div>
          </Card>

          <div className="vw-actionbar">
            <SubmitButton icon="plus" pendingLabel="Creating…">
              Create venue
            </SubmitButton>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
