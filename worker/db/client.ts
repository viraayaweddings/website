/**
 * PostgreSQL access for the admin panel and public APIs (Vercel / Node).
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, type DatabaseEnv } from "../env";
import { applyPgMigrations } from "./apply-pg-migrations";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export type { DatabaseEnv };

let dbPromise: Promise<Db | null> | null = null;
let schemaReady: Promise<void> | null = null;
let sqlClient: postgres.Sql | null = null;

async function ensureSchema(db: Db, client: postgres.Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = applyPgMigrations(db, client).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

/**
 * Loads HTML page shells when the public site injection path needs them.
 * Kept out of admin startup: the bundle is several MB of HTML.
 */
export async function ensurePageTemplates(db: Db): Promise<void> {
  const { seedPageTemplates } = await import("./seed-templates");
  await seedPageTemplates(db);
}

/**
 * Returns a ready-to-use client, or null when no Postgres URL is configured.
 */
export async function getDb(_env: DatabaseEnv = {}): Promise<Db | null> {
  const url = getDatabaseUrl();
  if (!url) return null;

  if (!dbPromise) {
    dbPromise = (async () => {
      if (!sqlClient) {
        sqlClient = postgres(url, {
          max: 1,
          prepare: false,
          ssl: "require",
          connect_timeout: 10,
        });
      }
      const db = drizzle(sqlClient, { schema });
      await ensureSchema(db, sqlClient);
      return db;
    })().catch((error) => {
      dbPromise = null;
      console.error("[db] connection failed", error instanceof Error ? error.message : error);
      throw error;
    });
  }

  return dbPromise;
}

export { schema };
