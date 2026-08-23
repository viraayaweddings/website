import { sql } from "drizzle-orm";
import { getDb } from "@/worker/db/client";
import { seedSiteContent } from "@/worker/db/seed-content";
import { blogPosts, heroSlides, hotels } from "@/worker/db/schema";
import { getCurrentUser, isAdmin } from "../_lib/auth";

export const dynamic = "force-dynamic";

/**
 * The session cookie alone would let another origin post here. Every
 * state-changing endpoint in the panel refuses a request that did not start on
 * this site; this one used to be the exception.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin form posts may omit it entirely.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
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

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ error: "Refused." }, { status: 403 });

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
