/**
 * Database error shapes the app needs to recognise, and what may be shown.
 *
 * Framework-neutral and import-free on purpose. It is read by server
 * components, by a client error boundary and by a public health route, so it
 * must not pull in the database client, "use server" module or anything else
 * that would tie it to one of those. (An earlier version of the unique-violation
 * helper lived in app/admin/users/actions.ts, and exporting a non-async
 * function from a server-action file made the RSC transform throw at module
 * load -- which in dev took down every route in the graph, including /api/lead.)
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

/**
 * The real reason behind a failed query, without the query.
 *
 * drizzle-orm wraps every driver error in a `DrizzleQueryError` whose message
 * is the SQL and the bound parameters -- `Failed query: select ... params: ...`
 * -- and puts the actual Postgres error on `cause`. Rendering `error.message`
 * therefore prints the statement and its values while hiding the one thing
 * worth reading, which is what the dashboard used to do.
 *
 * Parameters are the reason this matters beyond tidiness: they are lead email
 * addresses, names and search terms, and they were being drawn on screen.
 */
export function databaseErrorDetail(error: unknown): string {
  const seen = new Set<unknown>();
  let current: unknown = error;

  // Walk to the innermost cause; the driver error is what names the fault.
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const cause = (current as { cause?: unknown }).cause;
    if (!cause) break;
    current = cause;
  }

  const message = current instanceof Error ? current.message : String(current ?? "");
  // A cause chain that ends on another Drizzle wrapper still must not be shown.
  if (!message || isQueryText(message)) return "";

  const code = (current as { code?: unknown })?.code;
  return typeof code === "string" && code ? `${message} (${code})` : message;
}

/** True for drizzle's `Failed query: ... params: ...` wrapper text. */
function isQueryText(message: string): boolean {
  return message.startsWith("Failed query:");
}

/** True when the failure came from the database rather than the page. */
export function isDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  if (name === "DatabaseUnavailableError" || name === "SchemaOutOfDateError") return true;
  if (isQueryText(String((error as { message?: unknown }).message ?? ""))) return true;
  if ((error as { query?: unknown }).query !== undefined && (error as { params?: unknown }).params !== undefined) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && (cause as { code?: unknown }).code !== undefined) return true;
  // Last resort, for a message that named the fault without a driver shape --
  // and for the client boundary, where the name may already have been stripped.
  return /database|postgres|DATABASE_URL|POSTGRES_URL/i.test(
    String((error as { message?: unknown }).message ?? ""),
  );
}

/**
 * What to put on screen.
 *
 * `canSeeDetail` follows the rule /admin/health already set: a signed-in admin
 * gets the underlying reason, because they are the person who can act on it;
 * everyone else gets the status and a pointer. Neither ever gets the SQL.
 */
export function adminDatabaseMessage(error: unknown, canSeeDetail: boolean): string {
  const name = (error as { name?: unknown } | null)?.name;

  if (name === "DatabaseUnavailableError") {
    return "No database is configured for this deployment. Set POSTGRES_URL in the Vercel project settings and redeploy.";
  }
  if (name === "SchemaOutOfDateError") {
    return "The database is missing one or more migrations. Redeploy to apply them, then reload this page.";
  }

  const detail = canSeeDetail ? databaseErrorDetail(error) : "";
  return detail
    ? `The database rejected the query: ${detail}`
    : "The database could not be reached. Open /admin/health for the details.";
}

/**
 * Records the full failure where it can actually be read.
 *
 * The screen deliberately shows less than this, so without a log line there is
 * nowhere left holding the reason.
 */
export function logDatabaseError(where: string, error: unknown): void {
  const detail = databaseErrorDetail(error);
  const query = (error as { query?: unknown } | null)?.query;
  console.error(
    `[admin] ${where} failed: ${detail || String(error)}`,
    typeof query === "string" ? `\n  query: ${query}` : "",
  );
}
