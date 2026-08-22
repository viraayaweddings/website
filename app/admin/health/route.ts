import { sql } from "drizzle-orm";
import { getDb } from "@/worker/db/client";
import { getDatabaseUrl } from "@/worker/env";
import { getCurrentUser, isAdmin } from "../_lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const probe = await db.execute<{ users_table: string | null }>(sql`
      SELECT table_name AS users_table
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
      LIMIT 1
    `);
    const hasUsersTable = Array.isArray(probe) && probe.length > 0;
    return Response.json({ ok: true, schemaReady: hasUsersTable });
  } catch (error) {
    // Deliberately public so a broken deployment can be diagnosed without
    // signing in, but a driver error names the host and user it failed to
    // reach. The detail is for admins; anonymous callers get the status only.
    const message = error instanceof Error ? error.message : String(error);
    const user = await getCurrentUser().catch(() => null);
    return Response.json(
      user && isAdmin(user)
        ? { ok: false, error: message }
        : { ok: false, error: "Database unreachable. Sign in as an admin here for the details." },
      { status: 500 },
    );
  }
}
