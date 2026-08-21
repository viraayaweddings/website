/**
 * Image endpoint for the rich text editor.
 *
 * The panel's other uploads travel with the form they belong to, but an image
 * dropped into an article has to become a URL before the article is saved, so
 * it needs a route of its own. GET returns the library so an image already on
 * the site can be reused rather than uploaded twice.
 */
import { desc } from "drizzle-orm";
import { emptyEnv } from "@/worker/env";
import { uploadImage } from "@/worker/admin/media-store";
import { media } from "@/worker/db/schema";
import { getCurrentUser, requireDb } from "../../_lib/auth";

export const dynamic = "force-dynamic";

/** Enough to scroll through without turning the picker into its own screen. */
const LIBRARY_LIMIT = 60;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * The session cookie alone would let another origin post here. The editor
 * always sends same-origin, so anything else is refused.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin fetches may omit it entirely.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in again to browse images." }, 401);

  const db = await requireDb();
  const rows = await db
    .select({ key: media.key, filename: media.filename, size: media.size })
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(LIBRARY_LIMIT);

  return json({
    images: rows.map((row) => ({
      url: `/media/${row.key}`,
      filename: row.filename || row.key,
      size: row.size,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in again to upload." }, 401);
  if (!isSameOrigin(request)) return json({ error: "Refused." }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That upload could not be read." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file was sent." }, 400);

  const result = await uploadImage(emptyEnv(), file, user.email);
  if ("error" in result) return json({ error: result.error }, 400);

  return json({ url: `/media/${result.key}`, key: result.key });
}
