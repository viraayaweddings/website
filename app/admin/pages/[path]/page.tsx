// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { staticPages } from "@/worker/db/schema";
import { normalizeStaticPath } from "@/worker/site/static-pages";
import { AdminShell } from "../../_components/AdminShell";
import { SubmitButton, UnsavedGuard } from "../../_components/FormControls";
import { Icon } from "../../_components/icons";
import { Alert, Card, CardHead, Field, LinkButton, TextArea } from "../../_components/ui";
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
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/pages", "the pages");
  const db = await requireDb();
  const { path: encoded } = await params;
  const query = await searchParams;

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
          <LinkButton href={path} icon="external" variant="secondary">View page</LinkButton>
          <LinkButton href="/admin/pages" icon="chevronLeft" variant="secondary">All pages</LinkButton>
        </>
      }
    >
      {query.error ? (
        <div className="mb-4"><Alert tone="error" title="That did not save">{query.error}</Alert></div>
      ) : null}
      {query.saved ? (
        <div className="mb-4"><Alert tone="success" title="Saved">{query.saved}</Alert></div>
      ) : null}

      <Card pad={false}>
        <CardHead title="Search listing" icon="search" hint="What Google shows for this page" />
        <form action={saveStaticPageAction} className="vw-card-pad space-y-3">
          <UnsavedGuard />
          <input type="hidden" name="path" value={path} />
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
                  <form
                    key={image}
                    action={replacePageImageAction}
                    encType="multipart/form-data"
                    className="vw-card vw-card-pad"
                  >
                    <input type="hidden" name="path" value={path} />
                    <input type="hidden" name="current" value={image} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="vw-thumb"
                      style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                    />
                    <p className="vw-hint vw-mono mt-2" style={{ wordBreak: "break-all" }}>{image}</p>
                    <input
                      type="file"
                      name="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="vw-input mt-2"
                      aria-label={`Replacement for ${image}`}
                    />
                    <SubmitButton size="sm" icon="upload" variant="secondary">Replace</SubmitButton>
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
            <input type="hidden" name="path" value={path} />
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
