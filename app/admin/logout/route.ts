import { cookies } from "next/headers";
import { getDb } from "@/worker/db/client";
import { destroySessionByToken, SESSION_COOKIE } from "@/worker/admin/session";

export const dynamic = "force-dynamic";

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/** POST-only so a stray link or prefetch cannot sign the user out. */
export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || "";

  const db = await getDb();
  if (db) await destroySessionByToken(db, token).catch(() => undefined);

  cookieStore.delete(SESSION_COOKIE);

  return new Response(null, {
    status: 303,
    headers: { location: new URL("/admin/login", request.url).toString() },
  });
}
