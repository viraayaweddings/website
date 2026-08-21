// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { heroSlides, type HeroSlide } from "@/worker/db/schema";
import { heroImageUrl } from "@/worker/site/hero";
import { AdminShell } from "../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { ImageInput } from "../_components/ImageInput";
import { Alert, Badge, Card, CardHead, EmptyState, Field, TextArea } from "../_components/ui";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { createSlideAction, deleteSlideAction, moveSlideAction, updateSlideAction } from "./actions";

function SlideCard({
  slide,
  index,
  total,
  canDelete,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  canDelete: boolean;
}) {
  const preview = heroImageUrl(slide.imageKey);

  return (
    <Card pad={false}>
      <CardHead title={`Slide ${index + 1} of ${total}`} icon="slides">
        {slide.published ? <Badge tone="ok">live</Badge> : <Badge tone="neutral">hidden</Badge>}
        <form action={moveSlideAction} className="inline">
          <input type="hidden" name="id" value={slide.id} />
          <input type="hidden" name="direction" value="up" />
          <SubmitButton variant="ghost" size="sm" icon="arrowUp" pendingLabel="">
            {""}
          </SubmitButton>
        </form>
        <form action={moveSlideAction} className="inline">
          <input type="hidden" name="id" value={slide.id} />
          <input type="hidden" name="direction" value="down" />
          <SubmitButton variant="ghost" size="sm" icon="arrowDown" pendingLabel="">
            {""}
          </SubmitButton>
        </form>
      </CardHead>

      <div className="vw-card-pad grid gap-4 md:grid-cols-[16rem_1fr]">
        <div>
          {preview ? (
            // Plain img: these come from R2 or site-public, not the asset pipeline.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="vw-thumb h-36 w-full object-cover" loading="lazy" />
          ) : (
            <div className="vw-thumb grid h-36 w-full place-items-center" style={{ color: "var(--ink-faint)" }}>
              <Icon name="image" size={22} />
            </div>
          )}
          {/* The overlay text sits on this image, so show it the way visitors see it. */}
          <p className="mt-2 text-xs" style={{ color: "var(--ink-faint)" }}>
            Wide landscape images work best; text is laid over the left side.
          </p>
        </div>

        <form action={updateSlideAction} className="space-y-3">
          <UnsavedGuard />
          <input type="hidden" name="id" value={slide.id} />

          <Field label="Heading" name="title" defaultValue={slide.title} required />
          <TextArea label="Description" name="description" rows={2} defaultValue={slide.description} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Badge heading" name="badgeTitle" defaultValue={slide.badgeTitle} />
            <Field label="Badge subtext" name="badgeSubtitle" defaultValue={slide.badgeSubtitle} />
            <Field label="Button label" name="ctaLabel" defaultValue={slide.ctaLabel} />
            <Field label="Button link" name="ctaHref" defaultValue={slide.ctaHref} />
          </div>

          <ImageInput label="Replace background image" fileName="image" />

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" name="published" className="vw-check" defaultChecked={slide.published === 1} />
            Show this slide on the homepage
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <SubmitButton icon="check" size="sm">
              Save slide
            </SubmitButton>
          </div>
        </form>
      </div>

      {canDelete ? (
        <div className="flex justify-end border-t px-5 py-2" style={{ borderColor: "var(--line)" }}>
          <form action={deleteSlideAction}>
            <input type="hidden" name="id" value={slide.id} />
            <SubmitButton
              variant="danger-quiet"
              size="sm"
              icon="trash"
              pendingLabel="Deleting…"
              confirm={`Delete the slide "${slide.title}"?`}
            >
              Delete slide
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </Card>
  );
}

export default async function HeroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser("/admin/hero");
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const slides = await db.select().from(heroSlides).orderBy(asc(heroSlides.position), asc(heroSlides.id));
  const liveCount = slides.filter((slide) => slide.published).length;

  return (
    <AdminShell
      user={user}
      title="Hero slider"
      subtitle={`${slides.length} slide${slides.length === 1 ? "" : "s"}, ${liveCount} live on the homepage. They rotate in the order below.`}
    >
      {liveCount === 0 && slides.length > 0 ? (
        <div className="mb-4">
          <Alert tone="warning" title="Nothing is live">
            Every slide is hidden, so the homepage carousel falls back to its built-in slides. Tick
            &ldquo;Show this slide&rdquo; on at least one.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {slides.length === 0 ? (
            <Card>
              <EmptyState icon="slides" title="No slides yet">
                Add one on the right and it appears in the homepage carousel.
              </EmptyState>
            </Card>
          ) : (
            slides.map((slide, index) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={index}
                total={slides.length}
                canDelete={isAdmin(user)}
              />
            ))
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-20" pad={false}>
          <CardHead title="Add a slide" icon="plus" />
          <form action={createSlideAction} className="vw-card-pad space-y-3">
            <UnsavedGuard />
            <Field label="Heading" name="title" required />
            <TextArea label="Description" name="description" rows={2} />
            <Field label="Badge heading" name="badgeTitle" />
            <Field label="Badge subtext" name="badgeSubtitle" />
            <Field label="Button label" name="ctaLabel" />
            <Field
              label="Button link"
              name="ctaHref"
              hint="A site path like /contact, or a full https:// URL."
            />
            <ImageInput label="Background image" fileName="image" required />

            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
              <input type="checkbox" name="published" className="vw-check" defaultChecked />
              Show it as soon as it is added
            </label>

            <SubmitButton icon="plus" block pendingLabel="Adding…">
              Add slide
            </SubmitButton>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
