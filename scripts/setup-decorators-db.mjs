import pg from "pg";

const { Pool } = pg;

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return "postgresql://postgres@localhost:55432/viraayaweddings?schema=public";
}

function getPgConfig() {
  const parsed = new URL(getDatabaseUrl());
  const sslMode = parsed.searchParams.get("sslmode");
  const usesSsl = sslMode && sslMode.toLowerCase() !== "disable";
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  return {
    connectionString: parsed.toString(),
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
    ...(usesSsl
      ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } }
      : {})
  };
}

const pool = new Pool(getPgConfig());

const ddl = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "DecoratorCity" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "sourceCount" INTEGER NOT NULL,
  "importedCount" INTEGER NOT NULL,
  "seoPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Decorator" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vendorId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "shortAddress" TEXT,
  "formattedAddress" TEXT,
  "userRating" DOUBLE PRECISION,
  "userRatingCount" INTEGER,
  "isBhPartner" BOOLEAN NOT NULL DEFAULT false,
  "bhPartnerDealText" TEXT,
  "minDecorCost" INTEGER,
  "indoorPrice" INTEGER,
  "outdoorPrice" INTEGER,
  "listingOrder" INTEGER NOT NULL,
  "listingPayload" JSONB NOT NULL,
  "detailPayload" JSONB,
  "seoPayload" JSONB,
  "searchText" TEXT NOT NULL,
  "longitude" DOUBLE PRECISION,
  "latitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Decorator_citySlug_fkey"
    FOREIGN KEY ("citySlug") REFERENCES "DecoratorCity"("slug")
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "DecoratorMedia" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "decoratorId" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "localPath" TEXT,
  "mimeType" TEXT,
  "mediaId" TEXT,
  "source" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "DecoratorMedia_decoratorId_fkey"
    FOREIGN KEY ("decoratorId") REFERENCES "Decorator"("vendorId")
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DecoratorTag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "decoratorId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "DecoratorTag_decoratorId_fkey"
    FOREIGN KEY ("decoratorId") REFERENCES "Decorator"("vendorId")
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Decorator_citySlug_listingOrder_idx" ON "Decorator"("citySlug", "listingOrder");
CREATE INDEX IF NOT EXISTS "Decorator_citySlug_slug_idx" ON "Decorator"("citySlug", "slug");
CREATE INDEX IF NOT EXISTS "Decorator_city_partner_rating_order_idx"
  ON "Decorator"("citySlug", "isBhPartner" DESC, "userRating" DESC, "listingOrder" ASC);
CREATE INDEX IF NOT EXISTS "Decorator_userRating_idx" ON "Decorator"("userRating");
CREATE INDEX IF NOT EXISTS "Decorator_minDecorCost_idx" ON "Decorator"("minDecorCost");
CREATE INDEX IF NOT EXISTS "DecoratorMedia_decoratorId_position_idx" ON "DecoratorMedia"("decoratorId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "DecoratorTag_decoratorId_label_key" ON "DecoratorTag"("decoratorId", "label");
CREATE INDEX IF NOT EXISTS "DecoratorTag_label_idx" ON "DecoratorTag"("label");
`;

try {
  await pool.query(ddl);
  console.log("Decorator tables and indexes are ready.");
} finally {
  await pool.end();
}
