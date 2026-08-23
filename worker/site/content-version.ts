/**
 * Cross-instance cache invalidation.
 *
 * Every content module holds a module-scope cache with a short TTL, and the
 * `invalidate*Cache()` calls in the server actions cleared it only in the
 * lambda that handled the save. Every other warm instance kept serving the old
 * content until its own TTL lapsed -- thirty seconds for most of it, five
 * minutes for page templates and labels. The editor's own refresh could land on
 * a different instance and show the page they had just changed, unchanged,
 * which reads as "the save didn't work".
 *
 * A single row carries a counter that every write bumps. Instances read it on a
 * short poll -- one indexed lookup on a one-row table -- and drop their caches
 * when the number has moved. The per-module TTLs stay as the backstop; this is
 * what makes a save visible everywhere within the poll interval rather than
 * within the longest TTL in the codebase.
 */
import { sql } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";

/** How often an instance is willing to ask. Cheap enough to be this short. */
const POLL_MS = 2_000;

type Listener = () => void;

const listeners = new Set<Listener>();
let knownVersion: number | null = null;
let checkedAt = 0;
let inFlight: Promise<void> | null = null;

/** Registers a cache to be dropped when another instance writes. */
export function onContentChanged(listener: Listener): void {
  listeners.add(listener);
}

function dropAll(): void {
  for (const listener of listeners) listener();
}

/**
 * Bumps the counter so every other instance drops its caches.
 *
 * Called by the server actions alongside their local invalidation. Never
 * throws: failing to tell the other instances is a staleness problem, not a
 * reason to fail the save the editor just made.
 */
export async function publishContentChange(env: DatabaseEnv = {}): Promise<void> {
  try {
    const db = await getDb(env);
    if (!db) return;

    const rows = await db.execute<{ version: number }>(sql`
      INSERT INTO content_version (id, version, updated_at)
      VALUES (1, 1, now())
      ON CONFLICT (id) DO UPDATE
        SET version = content_version.version + 1, updated_at = now()
      RETURNING version
    `);

    // This instance already has the new content; record the number so the next
    // poll does not read its own write as somebody else's change.
    const version = Array.isArray(rows) ? Number(rows[0]?.version) : NaN;
    if (Number.isFinite(version)) knownVersion = version;
    checkedAt = Date.now();
  } catch (error) {
    console.error("[content-version] publish failed", error instanceof Error ? error.message : error);
  }
}

/**
 * Drops local caches if another instance has written since the last check.
 *
 * Call at the top of a request that is about to read cached content. Bounded by
 * POLL_MS and de-duplicated, so concurrent requests share one lookup.
 */
export async function syncContentVersion(env: DatabaseEnv = {}): Promise<void> {
  const now = Date.now();
  if (now - checkedAt < POLL_MS) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const db = await getDb(env);
      if (!db) return;

      const rows = await db.execute<{ version: number }>(sql`
        SELECT version FROM content_version WHERE id = 1
      `);
      const version = Array.isArray(rows) ? Number(rows[0]?.version ?? 0) : 0;

      if (knownVersion !== null && version !== knownVersion) dropAll();
      knownVersion = version;
    } catch {
      // A missing table or an unreachable database leaves the TTLs in charge,
      // which is the behaviour this replaced.
    } finally {
      checkedAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}
