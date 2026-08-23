import { sql } from "drizzle-orm";
import { getDb } from "@/worker/db/client";
import { getDatabaseUrl } from "@/worker/env";
import { logDatabaseError } from "@/worker/db/errors";

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
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch (error) {
    // Public and unauthenticated, so the reason is logged rather than returned:
    // a postgres connection failure names the host, port and role it could not
    // reach, and a query failure carries the statement and its parameters.
    // /admin/health answers the same question with the detail, for a signed-in
    // admin.
    logDatabaseError("api/health/db", error);
    return Response.json(
      { ok: false, error: "Database unreachable. Sign in as an admin and open /admin/health for the details." },
      { status: 500 },
    );
  }
}
