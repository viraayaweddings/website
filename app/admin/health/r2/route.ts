import { getR2Config } from "@/worker/env";
import { r2Delete, r2Head, r2Put } from "@/worker/storage/r2";
import { getCurrentUser, isAdmin } from "../../_lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Config the S3 client needs. Reported by name only -- never by value. */
const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"] as const;

/**
 * Round-trips a throwaway object through R2.
 *
 * Uploads fail the same way whether a variable is missing, a key is wrong or
 * the token cannot reach the bucket, and the admin only ever sees "upload
 * failed". This writes, reads back and deletes a few bytes so the real reason
 * is visible. Admin-only, because it writes.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Admin sign-in required." }, { status: 403 });
  }

  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    return Response.json(
      { ok: false, configured: false, missing, error: `Not configured: ${missing.join(", ")}` },
      { status: 503 },
    );
  }

  const config = getR2Config();
  if (!config) {
    return Response.json({ ok: false, configured: false, error: "R2 config incomplete." }, { status: 503 });
  }

  const key = `_health/probe-${Date.now()}.txt`;

  try {
    await r2Put(key, new TextEncoder().encode("ok"), "text/plain");
    const head = await r2Head(key);
    if (!head) {
      return Response.json(
        { ok: false, configured: true, bucket: config.bucket, error: "Uploaded object could not be read back." },
        { status: 500 },
      );
    }
    return Response.json({ ok: true, configured: true, bucket: config.bucket, roundTrip: "put/head/delete" });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        configured: true,
        bucket: config.bucket,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    // Never leave probes behind, even when the read-back failed.
    await r2Delete(key).catch(() => {});
  }
}
