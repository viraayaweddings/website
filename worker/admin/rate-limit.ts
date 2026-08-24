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
 * write back the same number, so a burst of attempts cost far fewer than one
 * each.
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
        // Bound as an ISO string, not as the Date.
        //
        // Through a column -- as in `.values()` above -- drizzle applies that
        // column's encoder and binds a string. Interpolated into a raw fragment
        // there is no column in sight, so the Date went to postgres.js as an
        // object and the driver threw:
        //
        //   The "string" argument must be of type string or an instance of
        //   Buffer or ArrayBuffer. Received an instance of Date
        //
        // Which took the whole action down. This runs on the *failed*-login
        // path, so a wrong password or an unknown address answered with the
        // admin error boundary instead of "those details are not right", while
        // a correct password signed in perfectly -- the failure only appeared
        // when someone mistyped. The cast is explicit so Postgres does not have
        // to infer the parameter's type from the other CASE branch.
        resetAt: sql`case when ${rateLimits.resetAt} <= now() then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });

  return (rows[0]?.count ?? 1) >= max;
}

export async function clearRateLimit(db: Db, key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key)).catch(() => undefined);
}
