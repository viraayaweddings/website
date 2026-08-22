// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc } from "drizzle-orm";
import { blogPosts } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { imageSrc } from "../_components/MediaPicker";
import { Card, EmptyState, LinkButton, StatusBadge, formatRelative } from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { bulkDeletePostsAction, deletePostAction, movePostAction } from "./actions";

const BLOGS_BULK_FORM = "blogs-bulk-form";

/** Whitelisted so a crafted query string cannot pick an arbitrary comparator. */
const SORT_KEYS = ["order", "title", "recent", "oldest"];
const SORT_LABELS: Record<string, string> = {
  order: "Listing order",
  title: "Title (A-Z)",
  recent: "Recently edited",
  oldest: "Least recently edited",
};

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    delete?: string;
    q?: string;
    status?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const user = await requireUser("/admin/blogs");
  const db = await requireDb();
  const params = await searchParams;
  const now = await currentTime();

  const posts = await db.select().from(blogPosts).orderBy(asc(blogPosts.position), asc(blogPosts.id));

  const liveCount = posts.filter((post) => post.status === "published").length;
  const query = (params.q || "").trim().slice(0, 120);
  const statusFilter = params.status === "draft" ? "draft" : params.status === "published" ? "published" : "";
  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const categoryFilter = categories.includes(params.category || "") ? params.category || "" : "";
  const sort = SORT_KEYS.includes(params.sort || "") ? params.sort || "order" : "order";
  const normalizedQuery = query.toLowerCase();
  const visiblePosts = posts
    .filter((post) => {
      if (statusFilter && post.status !== statusFilter) return false;
      if (categoryFilter && post.category !== categoryFilter) return false;
      if (!normalizedQuery) return true;
      return [
        post.heading,
        post.cardTitle,
        post.slug,
        post.category,
        post.publishedLabel,
        post.author,
      ].some((value) => (value || "").toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => {
      if (sort === "title") return (a.heading || a.slug).localeCompare(b.heading || b.slug);
      if (sort === "recent") return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sort === "oldest") return a.updatedAt.getTime() - b.updatedAt.getTime();
      // The default is the stored order, which is also the order on /blogs.
      return a.position - b.position || a.id - b.id;
    });
  const filtered = Boolean(query || statusFilter || categoryFilter || sort !== "order");
  // Reordering moves a post relative to the full list, so the arrows would lie
  // about what they do while a filter or a different sort is applied.
  const canReorder = !filtered;

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, status: statusFilter, category: categoryFilter, sort, ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.status) search.set("status", String(merged.status));
    if (merged.category) search.set("category", String(merged.category));
    if (merged.sort && merged.sort !== "order") search.set("sort", String(merged.sort));
    const string = search.toString();
    return `/admin/blogs${string ? `?${string}` : ""}`;
  };

  const listHref = href({});

  return (
    <AdminShell
      user={user}
      title="Articles"
      subtitle={`${visiblePosts.length} article${visiblePosts.length === 1 ? "" : "s"} shown from ${posts.length}, ${liveCount} published.${canReorder ? " The order here is the order they appear on the blog index." : " Clear the filters to reorder them."}`}
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

      <Card className="mb-4">
        <form method="get" className="space-y-3">
          <AutoSubmitControls />
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: "", label: "All" },
              { value: "published", label: `Published · ${liveCount}` },
              { value: "draft", label: `Drafts · ${posts.length - liveCount}` },
            ].map((option) => (
              <Link
                key={option.label}
                href={href({ status: option.value })}
                className="vw-chip"
                data-on={statusFilter === option.value}
              >
                {option.label}
              </Link>
            ))}
            {filtered ? (
              <Link href="/admin/blogs" className="vw-btn vw-btn-ghost vw-btn-sm ml-auto">
                <Icon name="close" size={13} />
                Reset filters
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <span className="vw-label">Search</span>
              <LiveSearch name="q" defaultValue={query} placeholder="Title, slug, category, author or date" />
            </div>
            <label className="block">
              <span className="vw-label">Status</span>
              <select name="status" defaultValue={statusFilter} className="vw-select">
                <option value="">Any status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="block">
              <span className="vw-label">Category</span>
              <select name="category" defaultValue={categoryFilter} className="vw-select">
                <option value="">Any category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="vw-label">Sort</span>
              <select name="sort" defaultValue={sort} className="vw-select">
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="vw-btn vw-btn-secondary">
              <Icon name="filter" size={15} />
              Apply
            </button>
          </div>
        </form>
      </Card>

      {visiblePosts.length === 0 ? (
        <Card>
          <EmptyState
            icon="article"
            title={filtered ? "No articles match these filters" : "No articles yet"}
            action={
              filtered
                ? <LinkButton href="/admin/blogs" variant="secondary">Clear filters</LinkButton>
                : <LinkButton href="/admin/blogs/new" variant="primary" icon="plus">Write the first one</LinkButton>
            }
          >
            {filtered
              ? "Try a different search term or status."
              : "Articles you publish appear on the blog index and in their category and tag pages."}
          </EmptyState>
        </Card>
      ) : (
        <>
        {isAdmin(user) ? (
          <form id={BLOGS_BULK_FORM}>
            <input type="hidden" name="returnTo" value={listHref} />
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
          {visiblePosts.map((post, index) => (
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
                    src={imageSrc(post.cardImage || post.bannerImage)}
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
                  {canReorder ? (
                    <>
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
                    </>
                  ) : null}
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
                      returnTo={listHref}
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
