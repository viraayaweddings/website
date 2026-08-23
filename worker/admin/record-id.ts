/**
 * Parses a numeric record id from a URL or a form field.
 *
 * `Number.parseInt` alone is not enough. `/^\d+$/` lets a twenty-digit id
 * through, `Number.isInteger(1e20)` is true, and the value then reaches
 * Postgres as a bigint against an `integer` column -- which raises a numeric
 * overflow, not a miss. The detail pages answered that with the admin crash
 * page instead of a 404, from nothing more than a crafted URL.
 */

/** Largest value a Postgres `serial` / `integer` column holds. */
export const MAX_RECORD_ID = 2147483647;

/** The id, or null when it is not one this database could ever hold. */
export function parseRecordId(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{1,10}$/.test(raw)) return null;

  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_RECORD_ID) return null;
  return id;
}
