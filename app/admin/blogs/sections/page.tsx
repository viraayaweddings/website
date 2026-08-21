// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { blogListings, blogPosts, pageTemplates } from "@/worker/db/schema";
import { AdminShell } from "../../_components/AdminShell";
import { CopyButton, SubmitButton } from "../../_components/FormControls";
import { Alert, Badge, Card, CardHead, EmptyState, LinkButton, TextArea } from "../../_components/ui";
import { requireDb, requireRole } from "../../_lib/auth";
import { saveSectionAction } from "./actions";

export default async function BlogSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin/blogs/sections");
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const [templates, listings, posts] = await Promise.all([
    db.select({ key: pageTemplates.key }).from(pageTemplates).orderBy(asc(pageTemplates.key)),
    db
      .select()
      .from(blogListings)
      .orderBy(asc(blogListings.taxonomy), asc(blogListings.taxonomySlug), asc(blogListings.position)),
    db
      .select({ slug: blogPosts.slug, heading: blogPosts.heading, status: blogPosts.status })
      .from(blogPosts)
      .orderBy(asc(blogPosts.position)),
  ]);

  // A section exists when a shell was stored for it.
  const sections = templates
    .map((row) => row.key)
    .filter((key) => key.startsWith("blog-tax:"))
    .map((key) => {
      const [, taxonomy, slug] = key.split(":");
      return { taxonomy, slug };
    });

  return (
    <AdminShell
      user={user}
      title="Categories and tags"
      subtitle={`${sections.length} section${sections.length === 1 ? "" : "s"}. Each lists a chosen set of articles, in the order you type them.`}
      actions={
        <LinkButton href="/admin/blogs" icon="chevronLeft" variant="ghost">
          Back to articles
        </LinkButton>
      }
    >
      <div className="mb-4">
        <Alert tone="info" title="These lists are chosen, not derived">
          An article can carry a category without appearing here — the listing is whatever you type below. A
          section with no articles shows the site&rsquo;s &ldquo;No blogs found&rdquo; message.
        </Alert>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {sections.length === 0 ? (
            <Card>
              <EmptyState icon="filter" title="No sections exist yet">
                Category and tag pages are created with the site build, not from this screen.
              </EmptyState>
            </Card>
          ) : (
            sections.map((section) => {
              const current = listings
                .filter((row) => row.taxonomy === section.taxonomy && row.taxonomySlug === section.slug)
                .map((row) => row.postSlug);

              return (
                <Card key={`${section.taxonomy}/${section.slug}`} pad={false}>
                  <CardHead
                    title={`${section.taxonomy} / ${section.slug}`}
                    hint={`/blogs/${section.taxonomy}/${section.slug}/ · ${current.length} article${current.length === 1 ? "" : "s"}`}
                    icon="filter"
                  >
                    <LinkButton
                      href={`/blogs/${section.taxonomy}/${section.slug}/`}
                      size="sm"
                      variant="ghost"
                      icon="external"
                      external
                    >
                      View
                    </LinkButton>
                  </CardHead>

                  <form action={saveSectionAction} className="vw-card-pad space-y-3">
                    <input type="hidden" name="taxonomy" value={section.taxonomy} />
                    <input type="hidden" name="slug" value={section.slug} />
                    <TextArea
                      label="Article slugs, one per line, in display order"
                      name="posts"
                      rows={Math.max(4, current.length + 2)}
                      defaultValue={current.join("\n")}
                      mono
                    />
                    <SubmitButton variant="secondary" size="sm" icon="check">
                      Save section
                    </SubmitButton>
                  </form>
                </Card>
              );
            })
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-20" pad={false}>
          <CardHead title="Available slugs" hint="Click to copy" icon="article" />
          <ul className="vw-divide max-h-[32rem] overflow-y-auto">
            {posts.map((post) => (
              <li key={post.slug} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span
                    className="vw-mono block truncate"
                    style={{ color: post.status === "published" ? "var(--ink)" : "var(--ink-faint)" }}
                  >
                    {post.slug}
                  </span>
                  <span className="block truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                    {post.heading}
                  </span>
                </span>
                {post.status === "published" ? null : <Badge tone="neutral">draft</Badge>}
                <CopyButton value={post.slug} label="slug" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
