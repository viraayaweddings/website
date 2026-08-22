"use server";

import { redirect } from "next/navigation";
import { emptyEnv } from "@/worker/env";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { releaseImage, uploadImage } from "@/worker/admin/media-store";
import { readRichText } from "@/worker/admin/rich-text";
import { blogListings, blogPosts, POST_STATUSES, type BlogFaq, type PostStatus } from "@/worker/db/schema";
import { invalidateBlogCache, invalidateBlogListingCache } from "@/worker/site/blog";
import { invalidateTemplateCache } from "@/worker/site/template";
import { recordAudit, requireDb, requireRole, requireUser } from "../_lib/auth";

const BLOGS_PATH = "/admin/blogs";

function failed(target: string, message: string): never {
  redirect(`${target}?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`${BLOGS_PATH}?saved=${encodeURIComponent(message)}`);
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

  for (const [key, value] of formData.entries()) {
    const match = /^faq_question_(\d+)$/.exec(key);
    if (!match) continue;

    const question = String(value).trim();
    if (!question) continue;

    const index = match[1];
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
  const used = new Set(faqs.map((faq) => faq.id).filter(Boolean));
  let next = Math.max(0, ...used) + 1;
  for (const faq of faqs) {
    if (!faq.id) {
      faq.id = next;
      next += 1;
    }
  }

  return faqs;
}

async function readImage(
  formData: FormData,
  fileField: string,
  pathField: string,
  existing: string,
  uploadedBy: string,
  target: string,
): Promise<string> {
  const file = formData.get(fileField);
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(emptyEnv(), file, uploadedBy);
    if ("error" in result) failed(target, result.error);
    return result.key;
  }

  const typed = String(formData.get(pathField) || "").trim();
  return typed || existing;
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
  const ogImage = await readImage(formData, "ogFile", "ogImage", bannerImage, actor.email, target);

  const [{ nextPosition }] = await db
    .select({ nextPosition: sql<number>`coalesce(max(${blogPosts.position}), -1) + 1` })
    .from(blogPosts);

  const inserted = await db
    .insert(blogPosts)
    .values({
      ...fields,
      position: Number(nextPosition),
      bannerImage,
      cardImage,
      ogImage,
      faqs: JSON.stringify(faqs),
    })
    .returning({ id: blogPosts.id });

  invalidateBlogCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "blog.created", "blog_post", inserted[0]?.id ?? 0, {
    slug: fields.slug,
  });

  done(`"${fields.heading}" created.`);
}

export async function updatePostAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(BLOGS_PATH);
  const target = `/admin/blogs/${id}`;

  const existing = (await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1))[0];
  if (!existing) failed(BLOGS_PATH, "That post no longer exists.");

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

  await db
    .update(blogPosts)
    .set({
      ...fields,
      bannerImage,
      cardImage,
      ogImage,
      faqs: JSON.stringify(faqs),
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));

  // Category and tag pages select posts by slug, so a rename would otherwise
  // leave those listings pointing at a slug that no longer exists and the
  // article would quietly vanish from every section it was in.
  if (existing.slug !== fields.slug) {
    await db
      .update(blogListings)
      .set({ postSlug: fields.slug })
      .where(eq(blogListings.postSlug, existing.slug));
    invalidateBlogListingCache();
  }

  // Release any image this post no longer uses, once the new one is saved.
  for (const [before, after] of [
    [existing.bannerImage, bannerImage],
    [existing.cardImage, cardImage],
    [existing.ogImage, ogImage],
  ]) {
    if (before && before !== after) await releaseImage(emptyEnv(), before);
  }

  invalidateBlogCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "blog.updated", "blog_post", id, {
    slug: fields.slug,
    status: { from: existing.status, to: fields.status },
  });

  done(`"${fields.heading}" saved.`);
}

/** Removing an article breaks its URL, so this is restricted to admins. */
export async function deletePostAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isInteger(id)) redirect(BLOGS_PATH);

  const existing = (await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1))[0];
  if (!existing) redirect(BLOGS_PATH);

  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  // Drop the category and tag entries that pointed at it, so no listing keeps
  // a reference to an article that no longer exists.
  await db.delete(blogListings).where(eq(blogListings.postSlug, existing.slug));
  invalidateBlogListingCache();

  for (const image of [existing.bannerImage, existing.cardImage, existing.ogImage]) {
    await releaseImage(emptyEnv(), image);
  }

  invalidateBlogCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "blog.deleted", "blog_post", id, {
    slug: existing.slug,
    heading: existing.heading,
  });

  done(`"${existing.heading}" deleted.`);
}

/** Nudges a post one place up or down the listing. */
export async function movePostAction(formData: FormData): Promise<void> {
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
      position: sql`case ${blogPosts.id} ${sql.join(
        ordered.map((post, position) => sql`when ${post.id} then ${position}`),
        sql` `,
      )} end`,
    })
    .where(inArray(blogPosts.id, ordered.map((post) => post.id)));

  invalidateBlogCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "blog.reordered", "blog_post", id, { direction });

  done("Order updated.");
}
