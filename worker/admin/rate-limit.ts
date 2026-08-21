/**
 * Postgres-backed rate limiting (admin login, etc.).
 */
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { rateLimits } from "../db/schema";

/** True when the key has hit its limit within the current window. */
export async function isRateLimited(db: Db, key: string, max: number): Promise<boolean> {
  const row = (await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1))[0];
  if (!row) return false;
  if (row.resetAt.getTime() <= Date.now()) return false;
  return row.count >= max;
}

/** Records one failed attempt. Returns true if the limit is now exceeded. */
export async function recordRateLimitAttempt(
  db: Db,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const row = (await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1))[0];

  if (!row || row.resetAt.getTime() <= now) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt: new Date(now + windowMs) })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, resetAt: new Date(now + windowMs) },
      });
    return false;
  }

  const next = row.count + 1;
  await db.update(rateLimits).set({ count: next }).where(eq(rateLimits.key, key));
  return next >= max;
}

export async function clearRateLimit(db: Db, key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key)).catch(() => undefined);
}
