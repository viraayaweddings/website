/**
 * Deletes submissions past the retention window.
 *
 * The leads table holds a name, an email address, a phone number, the full
 * submitted payload and a metadata blob carrying the submitter's IP address and
 * user agent. Nothing aged any of it out, so the panel accumulated personal
 * data indefinitely with no policy behind it.
 *
 * Run from a scheduled job (Vercel Cron, or any scheduler that can reach the
 * database). The window is deliberately a parameter rather than a constant, so
 * the retention decision lives with whoever makes it.
 *
 *   node --experimental-strip-types scripts/purge-old-leads.mjs --days 730
 *   node --experimental-strip-types scripts/purge-old-leads.mjs --days 730 --dry-run
 *
 * A purge writes an audit entry of its own, so the trail shows what left.
 */
import postgres from "postgres";

function argValue(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const days = Number.parseInt(argValue("days", "730"), 10);
const dryRun = process.argv.includes("--dry-run");

if (!Number.isInteger(days) || days < 30) {
  console.error("--days must be a whole number of at least 30.");
  process.exit(1);
}

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("No Postgres URL found. Set DATABASE_URL or POSTGRES_URL.");
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL_NO_VERIFY === "true" ? "require" : { rejectUnauthorized: true },
  connect_timeout: 20,
});

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

try {
  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM leads WHERE created_at < ${cutoff}
  `;

  if (count === 0) {
    console.log(`[leads:purge] nothing older than ${days} days`);
  } else if (dryRun) {
    console.log(`[leads:purge] would delete ${count} submission(s) older than ${days} days`);
  } else {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM leads WHERE created_at < ${cutoff}`;
      await tx`
        INSERT INTO audit_log (user_email, action, entity, entity_id, detail)
        VALUES (
          'system',
          'lead.retention_purge',
          'lead',
          'retention',
          ${JSON.stringify({ olderThanDays: days, removed: count, cutoff: cutoff.toISOString() })}
        )
      `;
    });
    console.log(
      `[audit] ${JSON.stringify({
        at: new Date().toISOString(),
        userEmail: "system",
        action: "lead.retention_purge",
        entity: "lead",
        entityId: "retention",
        detail: JSON.stringify({ olderThanDays: days, removed: count }),
      })}`,
    );
    console.log(`[leads:purge] deleted ${count} submission(s) older than ${days} days`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
