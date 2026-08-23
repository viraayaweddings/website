/**
 * Cross-content search, used by the command palette.
 *
 * One endpoint rather than one per table: the palette asks a single question —
 * "where is the thing called this?" — and the answer spans venues, articles,
 * cities and submissions. Results are capped per group so no single content
 * type can crowd out the others.
 */
import { asc, desc, ilike, or, type SQL } from "drizzle-orm";
import { blogPosts, cityPages, hotels, leads } from "@/worker/db/schema";
import { getCurrentUser, requireDb } from "../_lib/auth";

export const dynamic = "force-dynamic";

const PER_GROUP = 6;

export interface SearchHit {
  group: "Venues" | "Articles" | "City pages" | "Submissions";
  title: string;
  detail: string;
  href: string;
  status?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * `%` and `_` are wildcards to Postgres and drizzle adds no ESCAPE clause, so they
 * are neutralised rather than passed through.
 */
function needle(query: string): string {
  return `%${query.replace(/[%_]/g, " ").trim()}%`;
}

function firstClause(...clauses: (SQL | undefined)[]): SQL | undefined {
  const found = clauses.filter(Boolean) as SQL[];
  if (!found.length) return undefined;
  return found.length === 1 ? found[0] : or(...found);
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in again." }, 401);

  const query = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (query.length < 2) return json({ hits: [] });

  const db = await requireDb();
  const pattern = needle(query);
  const isAdmin = user.role === "admin";

  const [venues, posts, cities, submissions] = await Promise.all([
    db
      .select({ id: hotels.id, name: hotels.name, city: hotels.city, slug: hotels.slug, status: hotels.status })
      .from(hotels)
      .where(firstClause(ilike(hotels.name, pattern), ilike(hotels.slug, pattern), ilike(hotels.city, pattern)))
      .orderBy(asc(hotels.name))
      .limit(PER_GROUP),
    db
      .select({ id: blogPosts.id, heading: blogPosts.heading, slug: blogPosts.slug, status: blogPosts.status })
      .from(blogPosts)
      .where(firstClause(ilike(blogPosts.heading, pattern), ilike(blogPosts.slug, pattern)))
      .orderBy(asc(blogPosts.position))
      .limit(PER_GROUP),
    isAdmin
      ? db
          .select({ city: cityPages.city, seoTitle: cityPages.seoTitle })
          .from(cityPages)
          .where(firstClause(ilike(cityPages.city, pattern), ilike(cityPages.seoTitle, pattern)))
          .orderBy(asc(cityPages.city))
          .limit(PER_GROUP)
      : Promise.resolve([]),
    db
      .select({ id: leads.id, name: leads.name, email: leads.email, status: leads.status, form: leads.formName })
      .from(leads)
      .where(firstClause(ilike(leads.name, pattern), ilike(leads.email, pattern), ilike(leads.phone, pattern)))
      .orderBy(desc(leads.createdAt))
      .limit(PER_GROUP),
  ]);

  const hits: SearchHit[] = [
    ...venues.map((row) => ({
      group: "Venues" as const,
      title: row.name || row.slug,
      detail: `${row.city}/${row.slug}`,
      href: `/admin/hotels/${row.id}`,
      status: row.status,
    })),
    ...posts.map((row) => ({
      group: "Articles" as const,
      title: row.heading || row.slug,
      detail: `/blogs/${row.slug}`,
      href: `/admin/blogs/${row.id}`,
      status: row.status,
    })),
    ...cities.map((row) => ({
      group: "City pages" as const,
      title: row.city,
      detail: row.seoTitle,
      href: `/admin/cities/${row.city}`,
    })),
    ...submissions.map((row) => ({
      group: "Submissions" as const,
      title: row.name || row.email || `Submission #${row.id}`,
      detail: row.form || "",
      href: `/admin/leads/${row.id}`,
      status: row.status,
    })),
  ];

  return json({ hits });
}
