"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { blogListings } from "@/worker/db/schema";
import { invalidateBlogListingCache } from "@/worker/site/blog";
import { invalidateTemplateCache } from "@/worker/site/template";
import { recordAudit, requireDb, requireRole } from "../../_lib/auth";

const SECTIONS_PATH = "/admin/blogs/sections";

/** Category and tag pages are site structure, so editing them is admin-only. */
export async function saveSectionAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();

  const taxonomy = String(formData.get("taxonomy") || "");
  const slug = String(formData.get("slug") || "");
  if ((taxonomy !== "category" && taxonomy !== "tag") || !/^[a-z0-9-]+$/i.test(slug)) {
    redirect(SECTIONS_PATH);
  }

  // One post slug per line, in display order, duplicates dropped.
  const seen = new Set<string>();
  const posts = String(formData.get("posts") || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\/+|\/+$/g, ""))
    .filter((line) => {
      if (!/^[a-z0-9-]+$/i.test(line) || seen.has(line)) return false;
      seen.add(line);
      return true;
    });

  // Replaced wholesale: order is easiest to express as the order typed.
  await db
    .delete(blogListings)
    .where(and(eq(blogListings.taxonomy, taxonomy), eq(blogListings.taxonomySlug, slug)));

  for (const [position, postSlug] of posts.entries()) {
    await db.insert(blogListings).values({ taxonomy, taxonomySlug: slug, postSlug, position });
  }

  invalidateBlogListingCache();
  invalidateTemplateCache();
  await recordAudit(db, actor, "blog_section.updated", "blog_listing", `${taxonomy}/${slug}`, {
    posts: posts.length,
  });

  redirect(`${SECTIONS_PATH}?saved=1`);
}
