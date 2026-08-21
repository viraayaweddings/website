import { sql } from "drizzle-orm";
import { getDb } from "@/worker/db/client";
import { getDatabaseUrl } from "@/worker/env";

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
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
