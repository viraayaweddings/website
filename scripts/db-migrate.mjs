import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL before running migrations.");
  process.exit(1);
}

const db = drizzle(neon(url));
await migrate(db, { migrationsFolder: "drizzle-pg" });
console.log("PostgreSQL migrations applied.");
