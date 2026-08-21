// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { hotels, POST_STATUSES } from "@/worker/db/schema";
import { parseFaqs } from "@/worker/site/blog";
import { parseHighlights } from "@/worker/site/hotel";
import { parseNearby } from "@/worker/site/venue-listing";
import { AdminShell } from "../../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../../_components/FormControls";
import { ImageInput } from "../../_components/ImageInput";
import { RichText } from "../../_components/RichText";
import {
  Alert,
  Card,
  CardHead,
  Field,
  LinkButton,
  Select,
  StatusBadge,
  TextArea,
  formatDateTime,
} from "../../_components/ui";
import { isAdmin, requireDb, requireUser } from "../../_lib/auth";
import { deleteHotelAction, updateHotelAction } from "../actions";

/** Blank rows so entries can be added without any client-side JavaScript. */
const SPARE_ROWS = 2;

export default async function EditHotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id: rawId } = await params;
  // Digits only: parseInt would happily read "12abc" as 12 and serve a record
  // the URL does not actually name.
  if (!/^\d+$/.test(rawId)) notFound();
  const id = Number.parseInt(rawId, 10);

  const user = await requireUser(`/admin/hotels/${id}`);
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const hotel = (await db.select().from(hotels).where(eq(hotels.id, id)).limit(1))[0];
  if (!hotel) notFound();

  const highlights = parseHighlights(hotel.highlights);
  const faqs = parseFaqs(hotel.faqs);

  return (
    <AdminShell
      user={user}
      title={hotel.name || hotel.slug}
      subtitle={`/destination-wedding/${hotel.city}/${hotel.slug} · last edited ${formatDateTime(hotel.updatedAt)}`}
      actions={
        <>
          <StatusBadge status={hotel.status} />
          {/* A draft venue keeps its original built-in page, so previewing is
              the only way to see the edited version before publishing. */}
          <LinkButton
            href={
              hotel.status === "published"
                ? `/destination-wedding/${hotel.city}/${hotel.slug}`
                : `/destination-wedding/${hotel.city}/${hotel.slug}?preview=1`
            }
            icon={hotel.status === "published" ? "external" : "eye"}
            variant="secondary"
            external
          >
            {hotel.status === "published" ? "View" : "Preview draft"}
          </LinkButton>
          <LinkButton href="/admin/hotels" icon="chevronLeft" variant="ghost">
            Back
          </LinkButton>
        </>
      }
    >
      <div className="mb-4">
        <Alert tone="info" title="What this page controls">
          The URL is fixed and cannot be changed here. Which venues appear in this page&rsquo;s nearby strip is
          set below; which appear on the <strong>{hotel.city}</strong> city page is set on that city&rsquo;s own
          screen. The name, image and figures below are used everywhere this venue is listed.
        </Alert>
      </div>

      <form action={updateHotelAction} className="grid gap-4 lg:grid-cols-3">
        <UnsavedGuard />
        <input type="hidden" name="id" value={hotel.id} />

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card pad={false}>
            <CardHead title="Overview" icon="venue" />
            <div className="vw-card-pad space-y-4">
              <Field label="Venue name" name="name" defaultValue={hotel.name} required />
              <TextArea label="Address" name="address" rows={2} defaultValue={hotel.address} />
              <RichText
                label="Description"
                name="description"
                defaultValue={hotel.description}
                minHeight={340}
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
              {Array.from({ length: highlights.length + SPARE_ROWS }, (_, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-[10px] border p-3 sm:grid-cols-2"
                  style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  <Field
                    label={`Title ${index + 1}`}
                    name={`highlight_title_${index}`}
                    defaultValue={highlights[index]?.title}
                  />
                  <Field
                    label="Image path"
                    name={`highlight_image_${index}`}
                    defaultValue={highlights[index]?.image}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card pad={false}>
            <CardHead
              title="Nearby venues"
              hint={'The "Browse Similar Hotels" strip at the foot of this page'}
              icon="link"
            />
            <div className="vw-card-pad">
              <TextArea
                label="Venues"
                name="nearbySlugs"
                rows={5}
                defaultValue={parseNearby(hotel.nearbySlugs).join("\n")}
                mono
                hint="One per line as city/slug, in the order they should appear — for example agra/taj-agra. Leave empty to hide the strip."
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
              {Array.from({ length: faqs.length + SPARE_ROWS }, (_, index) => (
                <div
                  key={index}
                  className="rounded-[10px] border p-3"
                  style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  <input type="hidden" name={`faq_id_${index}`} value={faqs[index]?.id ?? ""} />
                  <Field
                    label={`Question ${index + 1}`}
                    name={`faq_question_${index}`}
                    defaultValue={faqs[index]?.question}
                  />
                  <div className="mt-2">
                    <RichText
                      label="Answer"
                      name={`faq_answer_${index}`}
                      defaultValue={faqs[index]?.answer}
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
                defaultValue={hotel.status}
                options={POST_STATUSES.map((status) => ({ value: status, label: status }))}
                hint="A draft venue keeps its original page rather than showing edited content."
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="At a glance" hint="The figures printed on the venue page" icon="bed" />
            <div className="vw-card-pad space-y-3">
              <Field label="Total room inventory" name="roomInventory" defaultValue={hotel.roomInventory} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Indoor venues" name="indoorVenues" defaultValue={hotel.indoorVenues} />
                <Field label="Outdoor venues" name="outdoorVenues" defaultValue={hotel.outdoorVenues} />
                <Field label="Guest capacity" name="guestCapacity" defaultValue={hotel.guestCapacity} />
                <Field label="Max. reception" name="receptionCapacity" defaultValue={hotel.receptionCapacity} />
                <Field label="From airport" name="airportTime" defaultValue={hotel.airportTime} />
                <Field label="From station" name="stationTime" defaultValue={hotel.stationTime} />
              </div>
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Banner" icon="image" />
            <div className="vw-card-pad">
              <ImageInput
                label="Banner image"
                pathName="bannerImage"
                fileName="bannerFile"
                current={hotel.bannerImage}
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead
              title="Listing card"
              hint="Used on the city page and on other venues&rsquo; nearby strips"
              icon="grid"
            />
            <div className="vw-card-pad space-y-3">
              <Field label="Thumbnail image path" name="thumbnailImage" defaultValue={hotel.thumbnailImage} />
              <Field
                label="Location"
                name="cityLabel"
                defaultValue={hotel.cityLabel}
                hint={'Full form, e.g. "Agra, India". City cards show the part before the comma.'}
              />
              <Field label="Venue type" name="venueCategory" defaultValue={hotel.venueCategory} />
              <Field
                label="Guest figure on cards"
                name="cardPax"
                defaultValue={hotel.cardPax}
                hint="Leave blank to use the guest capacity above."
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Search and social" icon="search" />
            <div className="vw-card-pad space-y-3">
              <Field label="Title tag" name="seoTitle" defaultValue={hotel.seoTitle} />
              <TextArea label="Meta description" name="metaDescription" rows={3} defaultValue={hotel.metaDescription} />
              <TextArea label="Meta keywords" name="metaKeywords" rows={2} defaultValue={hotel.metaKeywords} />
              <Field label="Social share image" name="ogImage" defaultValue={hotel.ogImage} />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Booking identifiers" icon="link" />
            <div className="vw-card-pad space-y-3">
              <Field
                label="Hotel ID"
                name="externalHotelId"
                defaultValue={hotel.externalHotelId}
                hint="Used by the enquiry form and cost calculator. Change only if you know it moved."
              />
              <Field label="Total rooms" name="totalRooms" defaultValue={hotel.totalRooms} />
            </div>
          </Card>

          <div className="vw-actionbar">
            <SubmitButton icon="check">Save venue</SubmitButton>
            <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
              The site updates within a minute.
            </span>
          </div>
        </div>
      </form>

      {isAdmin(user) ? (
        <Card className="mt-4" pad={false}>
          <CardHead title="Danger zone" icon="warning" />
          <div className="vw-card-pad">
            <p className="mb-3 text-sm" style={{ color: "var(--ink-soft)" }}>
              Deleting removes the managed content for this venue. It shipped with the site, so the page stays
              online and reverts to its original built-in version. Set it to draft above for the same effect
              without losing your edits.
            </p>
            <form action={deleteHotelAction}>
              <input type="hidden" name="id" value={hotel.id} />
              <SubmitButton
                variant="danger-quiet"
                icon="trash"
                pendingLabel="Deleting…"
                confirm={`Delete "${hotel.name || hotel.slug}"? This cannot be undone.`}
              >
                Delete venue
              </SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}
    </AdminShell>
  );
}
