import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedSiteContent } from "../worker/db/seed-content.ts";
import * as schema from "../worker/db/schema.ts";

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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const client = postgres(url, { max: 1, prepare: false, ssl: "require" });
const db = drizzle(client, { schema });

try {
  const result = await seedSiteContent(db, root);
  console.log(
    `Seeded ${result.statementsRun} statements from ${result.files} files` +
      (result.ignoredErrors ? ` (${result.ignoredErrors} duplicates skipped)` : "") +
      ".",
  );
  if (result.errors.length) {
    console.error("Errors:");
    for (const line of result.errors) console.error(`  - ${line}`);
    process.exit(1);
  }
} finally {
  await client.end({ timeout: 5 });
}
