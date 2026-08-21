import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("No Postgres URL found. Link Neon to the Vercel project or set DATABASE_URL / POSTGRES_URL.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = join(root, "drizzle-pg");

const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder });
  console.log(`PostgreSQL migrations applied from ${migrationsFolder}.`);
} finally {
  await sql.end({ timeout: 5 });
}
