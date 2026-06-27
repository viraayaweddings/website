import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getPrismaPgConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured before running the Prisma seed.");
  }

  const parsed = new URL(process.env.DATABASE_URL);
  const sslMode = parsed.searchParams.get("sslmode");
  const usesSsl = sslMode && sslMode.toLowerCase() !== "disable";

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  if (!usesSsl) {
    return { connectionString: parsed.toString() };
  }

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
  };
}

const adapter = new PrismaPg(getPrismaPgConfig());
const prisma = new PrismaClient({ adapter });

function n(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

async function main() {
  const db = JSON.parse(await readFile("data/photographers/database.json", "utf8"));

  for (const city of db.cities) {
    await prisma.photographerCity.upsert({
      where: { slug: city.slug },
      create: {
        name: city.name,
        slug: city.slug,
        sourceCount: city.sourceCount,
        importedCount: city.importedCount,
        seoPayload: city.seoPayload || undefined
      },
      update: {
        name: city.name,
        sourceCount: city.sourceCount,
        importedCount: city.importedCount,
        seoPayload: city.seoPayload || undefined
      }
    });
  }

  for (const photographer of db.photographers) {
    await prisma.photographer.upsert({
      where: { vendorId: photographer.vendorId },
      create: {
        vendorId: photographer.vendorId,
        name: photographer.name,
        slug: photographer.slug,
        citySlug: photographer.citySlug,
        shortAddress: photographer.shortAddress || null,
        formattedAddress: photographer.formattedAddress || null,
        userRating: n(photographer.userRating),
        userRatingCount: n(photographer.userRatingCount),
        isBhPartner: Boolean(photographer.isBhPartner),
        bhPartnerDealText: photographer.bhPartnerDealText || null,
        minPackageCost: n(photographer.minPackageCost),
        maxPackageCost: n(photographer.maxPackageCost),
        longitude: n(photographer.coordinates?.[0]),
        latitude: n(photographer.coordinates?.[1]),
        listingOrder: photographer.listingOrder,
        listingPayload: photographer.listingPayload || photographer,
        detailPayload: photographer.detailPayload || undefined,
        searchText: photographer.searchText
      },
      update: {
        name: photographer.name,
        citySlug: photographer.citySlug,
        shortAddress: photographer.shortAddress || null,
        formattedAddress: photographer.formattedAddress || null,
        userRating: n(photographer.userRating),
        userRatingCount: n(photographer.userRatingCount),
        isBhPartner: Boolean(photographer.isBhPartner),
        minPackageCost: n(photographer.minPackageCost),
        maxPackageCost: n(photographer.maxPackageCost),
        listingOrder: photographer.listingOrder,
        listingPayload: photographer.listingPayload || photographer,
        detailPayload: photographer.detailPayload || undefined,
        searchText: photographer.searchText
      }
    });

    await prisma.photographerMedia.deleteMany({ where: { photographerId: photographer.vendorId } });
    await prisma.photographerTag.deleteMany({ where: { photographerId: photographer.vendorId } });

    if (photographer.images?.length) {
      await prisma.photographerMedia.createMany({
        data: photographer.images
          .filter((image) => image.url || image.originalUrl)
          .map((image, index) => ({
            photographerId: photographer.vendorId,
            originalUrl: image.originalUrl || image.url,
            localPath: image.url || image.originalUrl || null,
            mimeType: image.mimeType || null,
            mediaId: image.mediaId || null,
            source: image.source || "detail",
            position: index
          }))
      });
    }

    if (photographer.tags?.length) {
      await prisma.photographerTag.createMany({
        data: [...new Set(photographer.tags)].map((label) => ({
          photographerId: photographer.vendorId,
          label
        })),
        skipDuplicates: true
      });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
