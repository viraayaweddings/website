// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { parseRecordId } from "@/worker/admin/record-id";
import { asc, eq } from "drizzle-orm";
import { blogPosts } from "@/worker/db/schema";
import { parseFaqs, tocEntries } from "@/worker/site/blog";
import { AdminShell } from "../../_components/AdminShell";
import { SubmitButton } from "../../_components/FormControls";
import { Alert, Badge, Card, CardHead, LinkButton, StatusBadge, formatDateTime } from "../../_components/ui";
import { isAdmin, requireDb, requireUser } from "../../_lib/auth";
import { PostForm } from "../_form";
import { deletePostAction, updatePostAction } from "../actions";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: rawId } = await params;
  // Bounded, not just numeric: a twenty-digit id passes a digits check,
  // parses to 1e20 and reaches Postgres as a bigint against an integer
  // column — an overflow, answered with the crash page rather than a 404.
  const id = parseRecordId(rawId);
  if (id === null) notFound();

  const user = await requireUser(`/admin/blogs/${id}`);
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.

  const post = (await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1))[0];
  if (!post) notFound();

  const headings = tocEntries(post.bodyHtml);
  const categories = (
    await db.selectDistinct({ category: blogPosts.category }).from(blogPosts).orderBy(asc(blogPosts.category))
  )
    .map((row) => row.category)
    .filter(Boolean);

  return (
    <AdminShell
      user={user}
      title={post.heading || post.slug}
      subtitle={`/blogs/${post.slug} · last edited ${formatDateTime(post.updatedAt)}`}
      actions={
        <>
          <StatusBadge status={post.status} />
          {/* A draft is not reachable on the site, so it gets a preview link
              instead — same page, rendered for a signed-in admin only. */}
          <LinkButton
            href={post.status === "published" ? `/blogs/${post.slug}` : `/blogs/${post.slug}?preview=1`}
            icon={post.status === "published" ? "external" : "eye"}
            variant="secondary"
            external
          >
            {post.status === "published" ? "View" : "Preview draft"}
          </LinkButton>
          <LinkButton href="/admin/blogs" icon="chevronLeft" variant="ghost">
            Back
          </LinkButton>
        </>
      }
    >
      <div className="mb-4">
        {headings.length > 0 ? (
          <Alert tone="quiet" title={`Table of contents · ${headings.length} entries`}>
            <span className="flex flex-wrap gap-1.5 pt-1">
              {headings.map((entry) => (
                <Badge key={entry.id} tone={entry.level === 3 ? "neutral" : "accent"}>
                  {entry.text}
                </Badge>
              ))}
            </span>
          </Alert>
        ) : (
          <Alert tone="warning" title="No table of contents">
            No headings with an id were found in the body, so this article shows an empty contents box. Use
            Heading 2 or Heading 3 in the editor and an id is added for you.
          </Alert>
        )}
      </div>

      <PostForm
        post={post}
        faqs={parseFaqs(post.faqs)}
        action={updatePostAction}
        submitLabel="Save article"
        categories={categories}
      />

      {isAdmin(user) ? (
        <Card className="mt-4" pad={false}>
          <CardHead title="Danger zone" icon="warning" />
          <div className="vw-card-pad">
            <p className="mb-3 text-sm" style={{ color: "var(--ink-soft)" }}>
              Deleting removes the article permanently and breaks its URL. Set it to draft instead if you only
              want it hidden.
            </p>
            <form action={deletePostAction}>
              <input type="hidden" name="id" value={post.id} />
              <SubmitButton
                variant="danger-quiet"
                icon="trash"
                pendingLabel="Deleting…"
                confirm={`Delete "${post.heading || post.slug}"? This cannot be undone.`}
              >
                Delete article
              </SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}
    </AdminShell>
  );
}
