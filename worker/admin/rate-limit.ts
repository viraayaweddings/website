/**
 * Postgres-backed rate limiting (admin login, etc.).
 */
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { rateLimits } from "../db/schema";

/** True when the key has hit its limit within the current window. */
export async function isRateLimited(db: Db, key: string, max: number): Promise<boolean> {
  const row = (await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1))[0];
  if (!row) return false;
  if (row.resetAt.getTime() <= Date.now()) return false;
  return row.count >= max;
}

/**
 * Records one failed attempt. Returns true if the limit is now exceeded.
 *
 * One statement, and the count is incremented by the database rather than in
 * JavaScript: read-then-write let simultaneous attempts read the same count and
 * write back the same number, so a burst cost far fewer than a burst of tries.
 */
export async function recordRateLimitAttempt(
  db: Db,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs);

  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        // An elapsed window starts over at one; otherwise this is one more try.
        count: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= now() then ${resetAt} else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });

  return (rows[0]?.count ?? 1) >= max;
}

export async function clearRateLimit(db: Db, key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key)).catch(() => undefined);
}
