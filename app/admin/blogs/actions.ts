"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { releaseImage, uploadImage } from "@/worker/admin/media-store";
import { mediaKeyFrom, mediaPathFromKey, readMediaPathValue } from "@/worker/admin/media-path";
import { readRichText } from "@/worker/admin/rich-text";
import { highestId, readRowIndices, TooManyRowsError } from "@/worker/admin/form-rows";
import { blogListings, blogPosts, POST_STATUSES, type BlogFaq, type PostStatus } from "@/worker/db/schema";
import { invalidateBlogCache, invalidateBlogListingCache } from "@/worker/site/blog";
import { invalidateTemplateCache } from "@/worker/site/template";
import { assertSameOrigin, recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";
import { hasMoved, readExpectedVersion, STALE_MESSAGE } from "../_lib/concurrency";
import { publishContentChange } from "@/worker/site/content-version";
import { withFlashKey } from "../_lib/flash";

const BLOGS_PATH = "/admin/blogs";

function failed(target: string, message: string): never {
  redirect(withFlashKey(`${target}?error=${encodeURIComponent(message)}`));
}

function done(message: string, target: string = BLOGS_PATH): never {
  redirect(withFlashKey(`${target}${target.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`));
}

/** The list view to return to, so filters, sort and page survive an action. */
function backTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return raw.startsWith(BLOGS_PATH) && !raw.startsWith("//") ? raw : BLOGS_PATH;
}

/**
 * Cover and social images are dropped straight into `src` attributes and
 * `url()` values on the public page, so they are stored as `/media/<key>`; a
 * bare key would resolve relative to the article and the picture would vanish.
 */
function readMediaPath(value: string, target: string): string {
  const result = readMediaPathValue(value);
  if ("error" in result) failed(target, result.error);
  return result.path;
}

/** Frees a stored image if nothing else points at it. Takes the stored path. */
async function releaseStoredImage(value: string): Promise<void> {
  const key = mediaKeyFrom(value);
  if (key) await releaseImage(emptyEnv(), key);
}

/** URL-safe, lowercase, no leading or trailing hyphen. */
function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * FAQ fields arrive as parallel faq_question_N / faq_answer_N inputs, which
 * keeps the form working without any client-side JavaScript. A cleared
 * question removes that entry.
 */
async function readFaqs(formData: FormData, target: string): Promise<BlogFaq[]> {
  const faqs: BlogFaq[] = [];

  // Indices are collected and capped before any answer is sanitised: each one
  // costs an HTMLRewriter instance, and the loop used to have no ceiling.
  let indices: string[];
  try {
    indices = readRowIndices(formData, "faq_question_", "FAQ entries");
  } catch (error) {
    failed(target, error instanceof TooManyRowsError ? error.message : "Too many FAQ entries.");
  }

  for (const index of indices) {
    const question = String(formData.get(`faq_question_${index}`) || "").trim();
    if (!question) continue;

    // Answers are HTML written in the editor, so they are sanitised and
    // length-checked rather than cut to a byte count, which would split a tag.
    const answer = await readRichText(String(formData.get(`faq_answer_${index}`) || ""), `The answer to "${question.slice(0, 40)}"`);
    if ("error" in answer) failed(target, answer.error);

    faqs.push({
      id: Number.parseInt(String(formData.get(`faq_id_${index}`) || "0"), 10) || 0,
      question: question.slice(0, 400),
      answer: answer.html,
    });
  }

  // Anchors must be unique and stable; assign ids to genuinely new entries only.
  let next = highestId(faqs.map((faq) => faq.id).filter(Boolean)) + 1;
  for (const faq of faqs) {
    if (!faq.id) {
      faq.id = next;
      next += 1;
    }
  }

  return faqs;
}

/**
 * The picture for one field.
 *
 * The picker always posts its field, so an empty value is a deliberate clear;
 * `fallback` only covers a form that genuinely omits the field.
 */
async function readImage(
  formData: FormData,
  fileField: string,
  pathField: string,
  fallback: string,
  uploadedBy: string,
  target: string,
): Promise<string> {
  const file = formData.get(fileField);
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, uploadedBy);
    if ("error" in result) failed(target, result.error);
    return mediaPathFromKey(result.key);
  }

  if (!formData.has(pathField)) return fallback;
  return readMediaPath(String(formData.get(pathField) || ""), target);
}

interface PostFields {
  slug: string;
  status: PostStatus;
  position: number;
  seoTitle: string;
  metaDescription: string;
  category: string;
  heading: string;
  publishedLabel: string;
  author: string;
  bodyHtml: string;
  cardTitle: string;
  cardExcerpt: string;
}

async function readFields(formData: FormData, target: string): Promise<PostFields> {
  const slug = normaliseSlug(String(formData.get("slug") || ""));
  const requestedStatus = String(formData.get("status") || "draft");
  const position = Number.parseInt(String(formData.get("position") || "0"), 10);

  const fields: PostFields = {
    slug,
    status: (POST_STATUSES as readonly string[]).includes(requestedStatus)
      ? (requestedStatus as PostStatus)
      : "draft",
    position: Number.isFinite(position) ? position : 0,
    seoTitle: String(formData.get("seoTitle") || "").trim().slice(0, 300),
    metaDescription: String(formData.get("metaDescription") || "").trim().slice(0, 500),
    category: String(formData.get("category") || "").trim().slice(0, 120),
    heading: String(formData.get("heading") || "").trim().slice(0, 300),
    publishedLabel: String(formData.get("publishedLabel") || "").trim().slice(0, 60),
    author: String(formData.get("author") || "").trim().slice(0, 120),
    bodyHtml: "",
    cardTitle: String(formData.get("cardTitle") || "").trim().slice(0, 300),
    cardExcerpt: String(formData.get("cardExcerpt") || "").trim().slice(0, 600),
  };

  const body = await readRichText(String(formData.get("bodyHtml") || ""), "The article body");
  if ("error" in body) failed(target, body.error);
  fields.bodyHtml = body.html;

  if (!fields.slug) failed(target, "Enter a URL slug, using letters, numbers and hyphens.");
  if (!fields.heading) failed(target, "Enter the heading shown on the article.");
  if (!fields.seoTitle) failed(target, "Enter the browser and search-result title.");
  if (!fields.cardTitle) failed(target, "Enter the title used on the blog listing card.");

  return fields;
}

export async function createPostAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();
  const target = "/admin/blogs/new";

  const fields = await readFields(formData, target);

  const clash = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, fields.slug))
    .limit(1);
  if (clash.length) failed(target, `The slug "${fields.slug}" is already in use.`);

  // Everything that can be refused is read before anything is uploaded, so a
  // rejected save leaves no orphaned image behind in R2.
  const faqs = await readFaqs(formData, target);

  const bannerImage = await readImage(formData, "bannerFile", "bannerImage", "", actor.email, target);
  const cardImage = await readImage(formData, "cardFile", "cardImage", "", actor.email, target);
  const ogImage = (await readImage(formData, "ogFile", "ogImage", bannerImage, actor.email, target)) || bannerImage;

  // A new article goes to the top of /blogs and of the admin list, which both
  // sort on position ascending. Taking one below the current lowest puts it
  // there without touching the order of anything already placed; the next
  // reorder renumbers the whole sequence from zero anyway.
  const [{ topPosition }] = await db
    .select({ topPosition: sql<number>`coalesce(min(${blogPosts.position}), 0) - 1` })
    .from(blogPosts);

  const inserted = await db
    .insert(blogPosts)
    .values({
      ...fields,
      position: Number(topPosition),
      bannerImage,
      cardImage,
      ogImage,
      faqs: JSON.stringify(faqs),
    })
    .returning({ id: blogPosts.id });

  invalidateBlogCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "blog.created", "blog_post", inserted[0]?.id ?? 0, {
    slug: fields.slug,
  });

  done(`"${fields.heading}" created.`);
}

export async function updatePostAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id) || id <= 0) failed(BLOGS_PATH, "That article could not be identified.");
  const target = `/admin/blogs/${id}`;

  const existing = (await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1))[0];
  if (!existing) failed(BLOGS_PATH, "That post no longer exists.");

  // Refused before anything is uploaded, so a losing save leaves nothing behind.
  const expectedVersion = readExpectedVersion(formData);
  if (hasMoved(expectedVersion, existing.updatedAt)) failed(target, STALE_MESSAGE);

  const fields = await readFields(formData, target);

  const clash = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, fields.slug), ne(blogPosts.id, id)))
    .limit(1);
  if (clash.length) failed(target, `The slug "${fields.slug}" is already in use.`);

  // Read before uploading, so a rejected save leaves no orphaned image in R2.
  const faqs = await readFaqs(formData, target);

  const bannerImage = await readImage(
    formData, "bannerFile", "bannerImage", existing.bannerImage, actor.email, target);
  const cardImage = await readImage(
    formData, "cardFile", "cardImage", existing.cardImage, actor.email, target);
  const ogImage = await readImage(
    formData, "ogFile", "ogImage", existing.ogImage, actor.email, target);

  // One transaction: a slug rename touches two tables, and a failure between
  // them would drop the article from every category and tag page it appears on
  // while leaving the article itself renamed.
  const saved = await db.transaction(async (tx) => {
    const rows = await tx
      .update(blogPosts)
      .set({
        ...fields,
        bannerImage,
        cardImage,
        ogImage,
        faqs: JSON.stringify(faqs),
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning({ id: blogPosts.id });

    if (!rows.length) return false;

    // Category and tag pages select posts by slug, so a rename would otherwise
    // leave those listings pointing at a slug that no longer exists and the
    // article would quietly vanish from every section it was in.
    if (existing.slug !== fields.slug) {
      await tx
        .update(blogListings)
        .set({ postSlug: fields.slug })
        .where(eq(blogListings.postSlug, existing.slug));
    }

    return true;
  });

  if (!saved) failed(target, "That post no longer exists.");
  if (existing.slug !== fields.slug) invalidateBlogListingCache();

  // Release any image this post no longer uses, once the new one is saved.
  for (const [before, after] of [
    [existing.bannerImage, bannerImage],
    [existing.cardImage, cardImage],
    [existing.ogImage, ogImage],
  ]) {
    if (before && before !== after) await releaseStoredImage(before);
  }

  invalidateBlogCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "blog.updated", "blog_post", id, {
    slug: fields.slug,
    status: { from: existing.status, to: fields.status },
  });

  done(`"${fields.heading}" saved.`);
}

/** Removing an article breaks its URL, so this is restricted to admins. */
export async function deletePostAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id) || id <= 0) failed(target, "That article could not be identified.");

  const existing = (await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1))[0];
  if (!existing) failed(target, "That article no longer exists.");

  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  // Drop the category and tag entries that pointed at it, so no listing keeps
  // a reference to an article that no longer exists.
  await db.delete(blogListings).where(eq(blogListings.postSlug, existing.slug));
  invalidateBlogListingCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();

  for (const image of [existing.bannerImage, existing.cardImage, existing.ogImage]) {
    await releaseStoredImage(image);
  }

  invalidateBlogCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "blog.deleted", "blog_post", id, {
    slug: existing.slug,
    heading: existing.heading,
  });

  done(`"${existing.heading || existing.slug}" deleted.`, target);
}

/** Deletes every selected article and cleans up listing rows and unused images. */
export async function bulkDeletePostsAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();
  const target = backTo(formData);
  const ids = formData
    .getAll("ids")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  const uniqueIds = [...new Set(ids)];

  if (!uniqueIds.length) failed(target, "Select at least one article first.");
  if (uniqueIds.length > 200) failed(target, "Delete 200 articles or fewer at a time.");

  const existing = await db.select().from(blogPosts).where(inArray(blogPosts.id, uniqueIds));
  if (existing.length !== uniqueIds.length) failed(target, "Some selected articles no longer exist. Refresh and try again.");

  await db.delete(blogPosts).where(inArray(blogPosts.id, uniqueIds));
  await db.delete(blogListings).where(inArray(blogListings.postSlug, existing.map((post) => post.slug)));
  invalidateBlogListingCache();
  // Tells the other instances their caches are stale; the local calls above
  // only reach this one.
  await publishContentChange();

  for (const post of existing) {
    for (const image of [post.bannerImage, post.cardImage, post.ogImage]) {
      await releaseStoredImage(image);
    }
  }

  invalidateBlogCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "blog.bulk_deleted", "blog_post", uniqueIds.join(","), {
    count: uniqueIds.length,
  });

  done(`${uniqueIds.length} article${uniqueIds.length === 1 ? "" : "s"} deleted.`, target);
}

/** Nudges a post one place up or down the listing. */
export async function movePostAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  const direction = String(formData.get("direction") || "");
  if (!Number.isInteger(id) || (direction !== "up" && direction !== "down")) redirect(BLOGS_PATH);

  const ordered = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .orderBy(asc(blogPosts.position), asc(blogPosts.id));

  const index = ordered.findIndex((post) => post.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) redirect(BLOGS_PATH);

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  // Rewrite the whole sequence so positions stay dense and unambiguous. One
  // statement rather than one per row: a partial rewrite would leave the list
  // in an order nobody asked for, and every row is a separate round trip.
  await db
    .update(blogPosts)
    .set({
      // Cast: the bound positions arrive untyped, so Postgres infers the whole
      // CASE as text and refuses to store it in an integer column.
      position: sql`(case ${blogPosts.id} ${sql.join(
        ordered.map((post, position) => sql`when ${post.id} then ${position}`),
        sql` `,
      )} end)::int`,
    })
    .where(inArray(blogPosts.id, ordered.map((post) => post.id)));

  invalidateBlogCache();
  invalidateTemplateCache();

  // Tells the other instances their caches are stale; the local calls above

  // only reach this one.

  await publishContentChange();
  await recordAudit(db, actor, "blog.reordered", "blog_post", id, { direction });

  done("Order updated.");
}
