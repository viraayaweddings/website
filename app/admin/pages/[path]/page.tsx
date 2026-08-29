// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { staticPages } from "@/worker/db/schema";
import { normalizeStaticPath } from "@/worker/site/static-pages";
import { AdminShell } from "../../_components/AdminShell";
import { CsrfField } from "../../_components/CsrfField";
import { SubmitButton, UnsavedGuard, VersionField } from "../../_components/FormControls";
import { Icon } from "../../_components/icons";
import { MediaPicker } from "../../_components/MediaPicker";
import { Card, CardHead, Field, LinkButton, StatusBadge, TextArea } from "../../_components/ui";
import { versionOf } from "../../_lib/concurrency";
import { requireDb, requireRole } from "../../_lib/auth";
import { replacePageImageAction, resetStaticPageAction, saveStaticPageAction } from "../actions";

/**
 * Every picture the page shows, in the order it shows them.
 *
 * Read from the markup rather than stored alongside it: the markup is the only
 * thing that knows which images are actually on the page, and it changes every
 * time one is swapped.
 */
function imagesIn(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/\/media\/[A-Za-z0-9/_.-]+?\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi)) {
    found.add(match[0]);
  }
  return [...found];
}

export default async function StaticPageEditor({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
}) {
  const user = await requireRole("admin", "/admin/pages", "the pages");
  const db = await requireDb();
  const { path: encoded } = await params;
  await searchParams; // The shell's toast reads these straight from the URL.

  const path = normalizeStaticPath(decodeURIComponent(encoded));
  const rows = await db.select().from(staticPages).where(eq(staticPages.path, path)).limit(1);
  const page = rows[0];
  if (!page) notFound();

  const images = imagesIn(page.html);

  return (
    <AdminShell
      user={user}
      title={page.title || path}
      subtitle={`${path} — ${images.length} ${images.length === 1 ? "picture" : "pictures"} on this page`}
      actions={
        <>
          <StatusBadge status={page.published === 1 ? "published" : "draft"} />
          {/* A hidden page serves the markup it shipped with, so previewing is
              the only way to see the stored version before showing it. */}
          <LinkButton
            href={page.published === 1 ? path : `${path}?preview=1`}
            icon={page.published === 1 ? "external" : "eye"}
            variant="secondary"
            external
          >
            {page.published === 1 ? "View page" : "Preview hidden page"}
          </LinkButton>
          <LinkButton href="/admin/pages" icon="chevronLeft" variant="secondary">All pages</LinkButton>
        </>
      }
    >
      <Card pad={false}>
        <CardHead title="Search listing" icon="search" hint="What Google shows for this page" />
        <form action={saveStaticPageAction} className="vw-card-pad space-y-3">
            <CsrfField />
          <UnsavedGuard />
          <input type="hidden" name="path" value={path} />
          <VersionField value={versionOf(page)} />
          <Field label="Title" name="title" defaultValue={page.title} />
          <TextArea
            label="Description"
            name="metaDescription"
            defaultValue={page.metaDescription}
            rows={3}
            hint="Around 155 characters is what fits in a result."
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" name="published" className="vw-check" defaultChecked={page.published === 1} />
            <span>Serve this stored version</span>
          </label>
          <SubmitButton icon="check">Save</SubmitButton>
        </form>
      </Card>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead
            title="Pictures"
            icon="image"
            hint="Replacing one changes it everywhere it appears on this page"
          />
          <div className="vw-card-pad">
            {images.length === 0 ? (
              <p className="vw-hint mb-0">This page has no pictures of its own.</p>
            ) : (
              <div className="vw-grid-cards">
                {images.map((image) => (
                  // No encType: a form whose action is a server function is
                  // always sent as multipart, and setting it by hand makes React
                  // warn that it overrode it.
                  <form key={image} action={replacePageImageAction} className="vw-card vw-card-pad space-y-2">
            <CsrfField />
                    <input type="hidden" name="path" value={path} />
                    <input type="hidden" name="current" value={image} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="vw-thumb"
                      style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                      loading="lazy"
                    />
                    <p className="vw-hint vw-mono" style={{ wordBreak: "break-all" }}>{image}</p>
                    <MediaPicker label="Replace with" name="replacement" shape="card" />
                    <SubmitButton size="sm" icon="upload" variant="secondary" pendingLabel="Replacing…">
                      Replace
                    </SubmitButton>
                  </form>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card pad={false}>
          <CardHead title="Start again" icon="refresh" />
          <form action={resetStaticPageAction} className="vw-card-pad">
            <CsrfField />
            <input type="hidden" name="path" value={path} />
            <input type="hidden" name="returnTo" value="/admin/pages" />
            <p className="vw-hint mb-3">
              <Icon name="info" /> Drops every change made here and puts the page back to the markup it shipped
              with. The page stays online throughout — that markup is what serves whenever there is no stored
              copy.
            </p>
            <SubmitButton variant="danger" icon="refresh" confirm={`Discard all changes to ${path}?`}>
              Reset this page
            </SubmitButton>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
