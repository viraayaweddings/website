/**
 * Database error shapes the admin forms need to recognise.
 *
 * Kept out of the "use server" action modules on purpose: a server-action file
 * may only export async functions, and exporting this helper from
 * app/admin/users/actions.ts made the RSC transform throw at module load --
 * which in dev took down every route in the graph, including /api/lead.
 */

/** Postgres unique-violation, however the driver surfaces it. */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "23505") return true;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && (cause as { code?: unknown }).code === "23505") return true;
  return /duplicate key value|unique constraint/i.test(String((error as { message?: unknown }).message ?? ""));
}
