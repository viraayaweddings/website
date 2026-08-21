/**
 * Runtime configuration for Vercel / Node (PostgreSQL + R2 via S3 API).
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
}

export function requireDatabaseUrl(): string {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string in Vercel project settings.");
  }
  return url;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string;
}

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || process.env.MEDIA_PUBLIC_BASE_URL,
  };
}

/** Legacy env shape kept so worker/site modules compile during migration. */
export type DatabaseEnv = Record<string, never>;

export function emptyEnv(): DatabaseEnv {
  return {};
}
