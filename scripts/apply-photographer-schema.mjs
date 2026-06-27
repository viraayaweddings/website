// Applies the Photographer* tables via the pg driver (Prisma 7's native engine
// fails SCRAM auth against Neon, but the pg adapter used at runtime works).
import pg from "pg";

function connectionConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured.");
  }
  const parsed = new URL(process.env.DATABASE_URL);
  const sslMode = parsed.searchParams.get("sslmode");
  const usesSsl = sslMode && sslMode.toLowerCase() !== "disable";
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");
  return {
    connectionString: parsed.toString(),
    ssl: usesSsl
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined
  };
}

const DDL = `
CREATE TABLE IF NOT EXISTS "PhotographerCity" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sourceCount" INTEGER NOT NULL,
  "importedCount" INTEGER NOT NULL,
  "seoPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhotographerCity_slug_key" ON "PhotographerCity"("slug");

CREATE TABLE IF NOT EXISTS "Photographer" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "shortAddress" TEXT,
  "formattedAddress" TEXT,
  "userRating" DOUBLE PRECISION,
  "userRatingCount" INTEGER,
  "isBhPartner" BOOLEAN NOT NULL DEFAULT false,
  "bhPartnerDealText" TEXT,
  "minPackageCost" INTEGER,
  "maxPackageCost" INTEGER,
  "listingOrder" INTEGER NOT NULL,
  "listingPayload" JSONB NOT NULL,
  "detailPayload" JSONB,
  "searchText" TEXT NOT NULL,
  "longitude" DOUBLE PRECISION,
  "latitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Photographer_vendorId_key" ON "Photographer"("vendorId");
CREATE INDEX IF NOT EXISTS "Photographer_citySlug_listingOrder_idx" ON "Photographer"("citySlug", "listingOrder");
CREATE INDEX IF NOT EXISTS "Photographer_citySlug_slug_idx" ON "Photographer"("citySlug", "slug");
CREATE INDEX IF NOT EXISTS "Photographer_city_partner_rating_order_idx" ON "Photographer"("citySlug", "isBhPartner" DESC, "userRating" DESC, "listingOrder" ASC);
CREATE INDEX IF NOT EXISTS "Photographer_userRating_idx" ON "Photographer"("userRating");
CREATE INDEX IF NOT EXISTS "Photographer_minPackageCost_idx" ON "Photographer"("minPackageCost");

CREATE TABLE IF NOT EXISTS "PhotographerMedia" (
  "id" TEXT PRIMARY KEY,
  "photographerId" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "localPath" TEXT,
  "mimeType" TEXT,
  "mediaId" TEXT,
  "source" TEXT NOT NULL,
  "position" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "PhotographerMedia_photographerId_position_idx" ON "PhotographerMedia"("photographerId", "position");

CREATE TABLE IF NOT EXISTS "PhotographerTag" (
  "id" TEXT PRIMARY KEY,
  "photographerId" TEXT NOT NULL,
  "label" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhotographerTag_photographerId_label_key" ON "PhotographerTag"("photographerId", "label");
CREATE INDEX IF NOT EXISTS "PhotographerTag_label_idx" ON "PhotographerTag"("label");
`;

const FKS = [
  {
    name: "Photographer_citySlug_fkey",
    sql: `ALTER TABLE "Photographer" ADD CONSTRAINT "Photographer_citySlug_fkey" FOREIGN KEY ("citySlug") REFERENCES "PhotographerCity"("slug") ON DELETE RESTRICT ON UPDATE CASCADE`
  },
  {
    name: "PhotographerMedia_photographerId_fkey",
    sql: `ALTER TABLE "PhotographerMedia" ADD CONSTRAINT "PhotographerMedia_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "Photographer"("vendorId") ON DELETE CASCADE ON UPDATE CASCADE`
  },
  {
    name: "PhotographerTag_photographerId_fkey",
    sql: `ALTER TABLE "PhotographerTag" ADD CONSTRAINT "PhotographerTag_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "Photographer"("vendorId") ON DELETE CASCADE ON UPDATE CASCADE`
  }
];

async function main() {
  const client = new pg.Client(connectionConfig());
  await client.connect();
  await client.query(DDL);
  console.log("Tables + indexes created.");
  for (const fk of FKS) {
    const exists = await client.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1`,
      [fk.name]
    );
    if (exists.rowCount === 0) {
      await client.query(fk.sql);
      console.log(`Added FK ${fk.name}`);
    } else {
      console.log(`FK ${fk.name} already exists`);
    }
  }
  await client.end();
  console.log("Photographer schema applied.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
