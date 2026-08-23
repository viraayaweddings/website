/**
 * PostgreSQL access for the admin panel and public APIs (Vercel / Node).
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, type DatabaseEnv } from "../env";
import { pendingMigrationNames } from "./apply-pg-migrations";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export type { DatabaseEnv };

let dbPromise: Promise<Db | null> | null = null;
let schemaReady: Promise<void> | null = null;
let sqlClient: postgres.Sql | null = null;

/** Thrown when the deployed code expects migrations the database has not run. */
export class SchemaOutOfDateError extends Error {
  constructor(pending: string[]) {
    super(
      `The database is missing ${pending.length} migration${pending.length === 1 ? "" : "s"} ` +
        `(${pending.join(", ")}). Run "npm run db:migrate" against this database, or redeploy so ` +
        `the build step applies them.`,
    );
    this.name = "SchemaOutOfDateError";
  }
}

/**
 * Confirms the schema is current. Does not change it.
 *
 * Migrations used to run here, on the first request into every cold lambda.
 * That put DDL on the request path, made the first request of each instance pay
 * for it, and required the runtime role to hold CREATE. They now run in the
 * build step (`npm run db:migrate`, wired into vercel.json), and this is the
 * check that a deployment cannot quietly run against a database behind it.
 *
 * Outside a deployment the migrations are still applied automatically, so a
 * fresh clone with a blank database keeps working without a separate command.
 */
async function ensureSchema(db: Db, client: postgres.Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pending = await pendingMigrationNames(client);
      if (!pending.length) return;

      // `vinext dev` runs a Vercel emulation and sets VERCEL=1, so that flag
      // alone marked local development as a deployment: the migrations were
      // never applied and every database-backed route threw instead.
      if (process.env.VERCEL && process.env.NODE_ENV === "production") {
        throw new SchemaOutOfDateError(pending);
      }

      // Local development: apply them rather than making every clone remember
      // to. The import is lazy so deployed bundles never pull the SQL in.
      const { applyPgMigrations } = await import("./apply-pg-migrations");
      await applyPgMigrations(db, client);
    })().catch((error) => {
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
 * TLS settings for the connection.
 *
 * `ssl: "require"` encrypts but does not check who is on the other end, which
 * is most of the point of TLS. Neon and Vercel Postgres both present a
 * certificate from a public CA, so verification works with Node's own trust
 * store. The escape hatch exists for a self-hosted database with a private CA;
 * it has to be set deliberately.
 */
function sslSettings(): postgres.Options<Record<string, never>>["ssl"] {
  if (process.env.DATABASE_SSL_NO_VERIFY === "true") return "require";
  return { rejectUnauthorized: true };
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
          ssl: sslSettings(),
          connect_timeout: 10,
          idle_timeout: 20,
          max_lifetime: 60 * 10,
        });
      }
      const db = drizzle(sqlClient, { schema });
      await ensureSchema(db, sqlClient);
      return db;
    })().catch(async (error) => {
      dbPromise = null;
      // The client is discarded too. Keeping it meant a retry after a bad URL
      // or a failed handshake reused the connection built from it and failed
      // the same way for the life of the instance.
      const stale = sqlClient;
      sqlClient = null;
      if (stale) await stale.end({ timeout: 1 }).catch(() => undefined);
      console.error("[db] connection failed", error instanceof Error ? error.message : error);
      throw error;
    });
  }

  return dbPromise;
}

export { schema };
