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
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
