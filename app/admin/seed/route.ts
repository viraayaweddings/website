import { sql } from "drizzle-orm";
import { getDb } from "@/worker/db/client";
import { seedSiteContent } from "@/worker/db/seed-content";
import { blogPosts, heroSlides, hotels } from "@/worker/db/schema";
import { getCurrentUser, isAdmin } from "../_lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function counts(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const [venueRows, postRows, slideRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(hotels),
    db.select({ total: sql<number>`count(*)` }).from(blogPosts),
    db.select({ total: sql<number>`count(*)` }).from(heroSlides),
  ]);

  return {
    venues: Number(venueRows[0]?.total ?? 0),
    articles: Number(postRows[0]?.total ?? 0),
    heroSlides: Number(slideRows[0]?.total ?? 0),
  };
}

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Admin sign-in required." }, { status: 403 });
  }

  const db = await getDb();
  if (!db) return Response.json({ error: "Database unavailable." }, { status: 503 });

  return Response.json({ ok: true, ...(await counts(db)) });
}

export async function POST(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Admin sign-in required." }, { status: 403 });
  }

  const db = await getDb();
  if (!db) return Response.json({ error: "Database unavailable." }, { status: 503 });

  const before = await counts(db);
  const result = await seedSiteContent(db);
  const after = await counts(db);

  return Response.json({
    ok: result.errors.length === 0,
    before,
    after,
    ...result,
  });
}
