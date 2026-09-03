import { sql } from "drizzle-orm";
import { getDb } from "@/worker/db/client";
import { PG_MIGRATION_NAMES } from "@/worker/db/apply-pg-migrations";
import { getDatabaseUrl } from "@/worker/env";
import { getCurrentUser, isAdmin } from "../_lib/auth";
import { databaseErrorDetail, logDatabaseError } from "../_lib/db-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Every table the code expects, so a partial schema can be named.
 *
 * The probe used to check only that `users` existed, which answered "can I sign
 * in" and nothing else: a database missing `leads` reported healthy while the
 * dashboard failed on every load. This is the list the panel is pointed at when
 * a query fails, so it has to be able to say which table is not there.
 */
const EXPECTED_TABLES = [
  "audit_log",
  "blog_listings",
  "blog_posts",
  "calculator_cities",
  "calculator_currencies",
  "calculator_hotels",
  "calculator_prices",
  "calculator_taxes",
  "calculator_budgets",
  "city_listings",
  "city_pages",
  "content_version",
  "hero_slides",
  "hotels",
  "leads",
  "media",
  "page_templates",
  "rate_limits",
  "sessions",
  "settings",
  "site_labels",
  "static_pages",
  "users",
  "venue_types",
] as const;

export async function GET(): Promise<Response> {
  const url = getDatabaseUrl();
  if (!url) {
    return Response.json(
      { ok: false, error: "No POSTGRES_URL or DATABASE_URL is configured for this deployment." },
      { status: 503 },
    );
  }

  try {
    const db = await getDb();
    if (!db) {
      return Response.json({ ok: false, error: "Database client could not be created." }, { status: 503 });
    }

    const rows = await db.execute<{ table_name: string }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const present = new Set((Array.isArray(rows) ? rows : []).map((row) => row.table_name));
    const missingTables = EXPECTED_TABLES.filter((name) => !present.has(name));

    const applied = await db.execute<{ name: string }>(sql`
      SELECT name FROM __migrations
    `).catch(() => []);
    const appliedNames = new Set((Array.isArray(applied) ? applied : []).map((row) => row.name));
    const pendingMigrations = PG_MIGRATION_NAMES.filter((name) => !appliedNames.has(name));

    const ok = missingTables.length === 0 && pendingMigrations.length === 0;

    // The exact table and migration names are diagnostic detail, same as the
    // driver error below -- an anonymous caller gets whether the deployment is
    // healthy, not the shape of what is wrong with it.
    const user = ok ? null : await getCurrentUser().catch(() => null);
    const detail =
      ok || (user && isAdmin(user))
        ? { schemaReady: present.has("users"), missingTables, pendingMigrations }
        : {};

    return Response.json(
      {
        ok,
        ...detail,
        ...(ok
          ? {}
          : {
              error:
                user && isAdmin(user)
                  ? "The database schema is behind this deployment. Redeploy to apply migrations."
                  : "Database schema is not ready. Sign in as an admin here for the details.",
            }),
      },
      { status: ok ? 200 : 500 },
    );
  } catch (error) {
    // Deliberately public so a broken deployment can be diagnosed without
    // signing in, but a driver error names the host and user it failed to
    // reach. The detail is for admins; anonymous callers get the status only.
    //
    // The detail is the underlying cause, not `error.message`: drizzle wraps
    // query failures so that the message is the SQL and its parameters and the
    // reason is on `cause`. Reporting the message gave an admin the statement
    // they already knew and none of the answer.
    logDatabaseError("health", error);
    const message = databaseErrorDetail(error) || (error instanceof Error ? error.name : String(error));
    const user = await getCurrentUser().catch(() => null);
    return Response.json(
      user && isAdmin(user)
        ? { ok: false, error: message }
        : { ok: false, error: "Database unreachable. Sign in as an admin here for the details." },
      { status: 500 },
    );
  }
}
