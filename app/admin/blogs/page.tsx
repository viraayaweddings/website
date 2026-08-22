// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc } from "drizzle-orm";
import { blogPosts } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { imagePreview } from "../_components/ImageInput";
import { Card, EmptyState, LinkButton, StatusBadge, formatRelative } from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { bulkDeletePostsAction, deletePostAction, movePostAction } from "./actions";

const BLOGS_BULK_FORM = "blogs-bulk-form";

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; delete?: string }>;
}) {
  const user = await requireUser("/admin/blogs");
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.
  const now = await currentTime();

  const posts = await db.select().from(blogPosts).orderBy(asc(blogPosts.position), asc(blogPosts.id));

  const liveCount = posts.filter((post) => post.status === "published").length;

  return (
    <AdminShell
      user={user}
      title="Articles"
      subtitle={`${posts.length} article${posts.length === 1 ? "" : "s"}, ${liveCount} published. The order here is the order they appear on the blog index.`}
      actions={
        <>
          {isAdmin(user) ? (
            <LinkButton href="/admin/blogs/sections" icon="filter" variant="secondary">
              Categories and tags
            </LinkButton>
          ) : null}
          <LinkButton href="/admin/blogs/new" icon="plus" variant="primary">
            New article
          </LinkButton>
        </>
      }
    >

      {posts.length === 0 ? (
        <Card>
          <EmptyState
            icon="article"
            title="No articles yet"
            action={<LinkButton href="/admin/blogs/new" variant="primary" icon="plus">Write the first one</LinkButton>}
          >
            Articles you publish appear on the blog index and in their category and tag pages.
          </EmptyState>
        </Card>
      ) : (
        <>
        {isAdmin(user) ? (
          <form id={BLOGS_BULK_FORM}>
            <BulkSelection noun="article" formId={BLOGS_BULK_FORM}>
              <SubmitButton
                variant="danger-quiet"
                size="sm"
                icon="trash"
                pendingLabel="Deleting…"
                formAction={bulkDeletePostsAction}
                confirm="Delete every selected article? This cannot be undone."
              >
                Delete
              </SubmitButton>
            </BulkSelection>
          </form>
        ) : null}

        <div className="space-y-2.5">
          {posts.map((post, index) => (
            <Card key={post.id} className="transition hover:-translate-y-px">
              <div className="flex flex-wrap items-start gap-3">
                {isAdmin(user) ? (
                  <div className="pt-4">
                    <RowCheckbox id={post.id} label={post.heading || post.slug} form={BLOGS_BULK_FORM} />
                  </div>
                ) : null}
                {post.cardImage || post.bannerImage ? (
                  // Plain img: these come from R2 or site-public, not the asset pipeline.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview(post.cardImage || post.bannerImage)}
                    alt=""
                    className="vw-thumb h-14 w-20 flex-none object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="vw-thumb grid h-14 w-20 flex-none place-items-center"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    <Icon name="article" size={16} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/blogs/${post.id}`}
                      className="truncate font-medium hover:underline"
                      style={{ color: "var(--ink)" }}
                    >
                      {post.heading || post.slug}
                    </Link>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="vw-mono truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                    /blogs/{post.slug}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-2 text-xs" style={{ color: "var(--ink-faint)" }}>
                    {post.category ? <span>{post.category}</span> : null}
                    {post.publishedLabel ? <span>· {post.publishedLabel}</span> : null}
                    <span>· edited {formatRelative(post.updatedAt, now)}</span>
                  </p>
                </div>

                <div className="flex flex-none items-center gap-1">
                  <form action={movePostAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="direction" value="up" />
                    <SubmitButton variant="ghost" size="sm" icon="arrowUp" pendingLabel="" label={`Move "${post.cardTitle || post.heading || post.slug}" up`}>
                      {""}
                    </SubmitButton>
                  </form>
                  <form action={movePostAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="direction" value="down" />
                    <SubmitButton variant="ghost" size="sm" icon="arrowDown" pendingLabel="" label={`Move "${post.cardTitle || post.heading || post.slug}" down`}>
                      {""}
                    </SubmitButton>
                  </form>
                  <LinkButton href={`/admin/blogs/${post.id}`} size="sm" variant="secondary" icon="edit">
                    Edit
                  </LinkButton>
                  <LinkButton href={`/blogs/${post.slug}`} size="sm" variant="ghost" icon="external" external />
                  {isAdmin(user) ? (
                    <DeleteConfirmTrigger
                      action={deletePostAction}
                      id={post.id}
                      what={post.heading || post.slug}
                      note={`This removes the article permanently and breaks /blogs/${post.slug}. Set it to draft instead if you only want it hidden.`}
                      ariaLabel={`Delete ${post.heading || post.slug}`}
                    />
                  ) : null}
                </div>
              </div>
              <span className="sr-only">Position {index + 1}</span>
            </Card>
          ))}
        </div>
        </>
      )}
    </AdminShell>
  );
}
