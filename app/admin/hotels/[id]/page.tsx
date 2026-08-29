// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { parseRecordId } from "@/worker/admin/record-id";
import { versionOf } from "../../_lib/concurrency";
import { asc, eq } from "drizzle-orm";
import { hotels, POST_STATUSES } from "@/worker/db/schema";
import { parseFaqs } from "@/worker/site/blog";
import { galleryFor, parseHighlights } from "@/worker/site/hotel";
import { parseNearby } from "@/worker/site/venue-listing";
import { loadAllVenueTypes, parseWeddingTypes } from "@/worker/site/venue-types";
import { AdminShell } from "../../_components/AdminShell";
import { CsrfField } from "../../_components/CsrfField";
import { SubmitButton, UnsavedGuard, VersionField } from "../../_components/FormControls";
import { MediaPicker } from "../../_components/MediaPicker";
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
  // Bounded, not just numeric: a twenty-digit id passes a digits check,
  // parses to 1e20 and reaches Postgres as a bigint against an integer
  // column — an overflow, answered with the crash page rather than a 404.
  const id = parseRecordId(rawId);
  if (id === null) notFound();

  const user = await requireUser(`/admin/hotels/${id}`);
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const hotel = (await db.select().from(hotels).where(eq(hotels.id, id)).limit(1))[0];
  if (!hotel) notFound();

  const highlights = parseHighlights(hotel.highlights);
  // Resolved, not raw: a venue whose gallery has never been filled opens on
  // the pictures its page is actually rendering rather than on empty rows.
  const gallery = galleryFor(hotel, highlights);
  const faqs = parseFaqs(hotel.faqs);
  const cities = await db.selectDistinct({ city: hotels.city }).from(hotels).orderBy(asc(hotels.city));
  // Hidden types are offered too: a venue already tagged with one should not
  // lose the tag just because the filter is currently switched off.
  const venueTypeOptions = await loadAllVenueTypes();
  const selectedTypes = new Set(parseWeddingTypes(hotel.weddingTypes));

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
          Changing the city or slug moves the page and rewrites every list that points at it. Which venues appear
          in this page&rsquo;s nearby strip is set below; which appear on the <strong>{hotel.city}</strong> city
          page is set on that city&rsquo;s own screen. The name, image and figures below are used everywhere this
          venue is listed.
        </Alert>
      </div>

      <form action={updateHotelAction} className="grid gap-4 lg:grid-cols-3">
            <CsrfField />
        <UnsavedGuard />
        <input type="hidden" name="id" value={hotel.id} />
        <VersionField value={versionOf(hotel)} />

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card pad={false}>
            <CardHead title="Overview" icon="venue" />
            <div className="vw-card-pad space-y-4">
              <Field label="Venue name" name="name" defaultValue={hotel.name} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="City"
                  name="city"
                  defaultValue={hotel.city}
                  list="venue-cities"
                  required
                  hint="Lowercase, hyphenated. Changing this moves the page."
                />
                <Field
                  label="URL slug"
                  name="slug"
                  defaultValue={hotel.slug}
                  required
                  hint={`Currently /destination-wedding/${hotel.city}/${hotel.slug}`}
                />
              </div>
              <datalist id="venue-cities">
                {cities.map((row) => (
                  <option key={row.city} value={row.city} />
                ))}
              </datalist>
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
                  <MediaPicker
                    label="Picture"
                    name={`highlight_image_${index}`}
                    defaultValue={highlights[index]?.image ?? ""}
                    shape="card"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card pad={false}>
            <CardHead
              title="Event Spaces Gallery"
              hint="Clear a picture to remove it. Rows render in this order; blank rows are ignored."
              icon="sparkle"
            />
            <div className="vw-card-pad space-y-3">
              {Array.from({ length: gallery.length + SPARE_ROWS }, (_, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-[10px] border p-3 sm:grid-cols-2"
                  style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  <MediaPicker
                    label={`Picture ${index + 1}`}
                    name={`gallery_image_${index}`}
                    defaultValue={gallery[index]?.image ?? ""}
                    shape="wide"
                  />
                  <Field
                    label="Caption"
                    name={`gallery_caption_${index}`}
                    defaultValue={gallery[index]?.caption}
                    hint="Shown in the lightbox and read by screen readers. Defaults to the venue name."
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
              <MediaPicker label="Banner image" name="bannerImage" defaultValue={hotel.bannerImage} />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead
              title="Listing card"
              hint="Used on the city page and on other venues&rsquo; nearby strips"
              icon="grid"
            />
            <div className="vw-card-pad space-y-3">
              <MediaPicker
                label="Thumbnail"
                name="thumbnailImage"
                defaultValue={hotel.thumbnailImage}
                shape="card"
                hint="Shown on city pages and nearby strips."
              />
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
              <Field
                label="Listing order"
                name="listingPosition"
                defaultValue={String(hotel.listingPosition)}
                hint="Lower comes first on /hotel-listing. Leave high to sort to the end."
              />
              <div className="space-y-2">
                {/*
                  The filters on /hotel-listing and the city index pages read
                  these tags, and the list itself comes from `venue_types`, so
                  the boxes here and the boxes a visitor sees are the same rows.
                */}
                <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  Wedding types
                </span>
                <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  What /hotel-listing filters this venue under.
                </p>
                {venueTypeOptions.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                    No wedding types are set up yet.
                  </p>
                ) : (
                  venueTypeOptions.map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--ink)" }}
                    >
                      <input
                        type="checkbox"
                        name="weddingTypes"
                        value={type.slug}
                        className="vw-check"
                        defaultChecked={selectedTypes.has(type.slug)}
                      />
                      <span>{type.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Search and social" icon="search" />
            <div className="vw-card-pad space-y-3">
              <Field label="Title tag" name="seoTitle" defaultValue={hotel.seoTitle} />
              <TextArea label="Meta description" name="metaDescription" rows={3} defaultValue={hotel.metaDescription} />
              <TextArea label="Meta keywords" name="metaKeywords" rows={2} defaultValue={hotel.metaKeywords} />
              <MediaPicker label="Social share image" name="ogImage" defaultValue={hotel.ogImage} />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Booking identifiers" icon="link" />
            <div className="vw-card-pad space-y-3">
              <Field
                label="Hotel ID"
                name="externalHotelId"
                defaultValue={hotel.externalHotelId}
                hint="Links this venue to its rates in the cost calculator. Must name a hotel that exists there, or be blank."
              />
              {/*
                "Total rooms" used to sit here, holding the same number as the
                calculator's own field with nothing keeping the two in step.
                The calculator is the single source; edit it there.
              */}
              <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Room capacity is set under{" "}
                <Link href="/admin/calculator/hotels" style={{ textDecoration: "underline" }}>
                  Cost calculator → Hotels
                </Link>
                , which is what caps the rooms input on this venue&rsquo;s calculator.
              </p>
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
            <CsrfField />
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
