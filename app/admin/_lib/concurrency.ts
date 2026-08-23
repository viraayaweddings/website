/**
 * Optimistic concurrency for the panel's edit forms.
 *
 * Every save was an unconditional `UPDATE ... WHERE id = ?` over the full field
 * set. With two people in the same venue, whoever saved second overwrote the
 * first's work with the values their own form had loaded -- no warning, no
 * trace beyond two audit entries that looked identical. Every row already
 * carried `updatedAt`; nothing read it.
 *
 * The form now carries the `updatedAt` it was rendered from, and the update
 * matches on it. Zero rows affected means someone else saved in between.
 */

/** Hidden field name; paired with `<VersionField />` in _components/FormControls. */
export const VERSION_FIELD = "expectedUpdatedAt";

/**
 * The version the form was rendered from, or null when it carries none.
 *
 * Null is not an error: creation forms have no prior version, and a form that
 * predates this field should still save rather than refusing to.
 */
export function readExpectedVersion(formData: FormData): Date | null {
  const raw = String(formData.get(VERSION_FIELD) || "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Serialises a row's version for the hidden field. */
export function versionOf(row: { updatedAt: Date | string | null | undefined }): string {
  const value = row.updatedAt;
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Whether the row has moved since the form was rendered.
 *
 * Compared to the second: Postgres stores microseconds and a round trip through
 * an ISO string keeps milliseconds, so an exact equality test in SQL would
 * report a conflict that is not one. A concurrent save that lands inside the
 * same millisecond is not a case worth chasing.
 */
export function hasMoved(expected: Date | null, actual: Date | string): boolean {
  if (!expected) return false;
  const current = actual instanceof Date ? actual : new Date(actual);
  return Math.abs(current.getTime() - expected.getTime()) > 1000;
}

export const STALE_MESSAGE =
  "Someone else saved this while you were editing. Your changes were not applied — open it again and redo them so their work is not overwritten.";
