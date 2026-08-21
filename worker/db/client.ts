/**
 * PostgreSQL access for the admin panel and public APIs (Vercel / Node).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { getDatabaseUrl, type DatabaseEnv } from "../env";
import * as schema from "./schema";
import { seedPageTemplates } from "./seed-templates";

export type Db = NeonHttpDatabase<typeof schema>;

export type { DatabaseEnv };

let dbPromise: Promise<Db | null> | null = null;
let schemaReady: Promise<void> | null = null;

async function ensureSchema(db: Db): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await migrate(db, { migrationsFolder: "drizzle-pg" });
      await seedPageTemplates(db);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

/**
 * Returns a ready-to-use client, or null when DATABASE_URL is absent.
 */
export async function getDb(_env: DatabaseEnv = {}): Promise<Db | null> {
  const url = getDatabaseUrl();
  if (!url) return null;

  if (!dbPromise) {
    dbPromise = (async () => {
      const sql = neon(url);
      const db = drizzle(sql, { schema });
      await ensureSchema(db);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

export { schema };
