import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

function n(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function text(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return String(value.name || value.title || value.label || value.areaName || "");
  }
  return String(value);
}

async function main() {
  const db = JSON.parse(await readFile("data/venues/database.json", "utf8"));
  for (const city of db.cities) {
    await prisma.city.upsert({
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

  for (const venue of db.venues) {
    await prisma.venue.upsert({
      where: { vendorId: venue.vendorId },
      create: {
        vendorId: venue.vendorId,
        name: venue.name,
        slug: venue.slug,
        citySlug: venue.citySlug,
        shortAddress: venue.shortAddress || null,
        formattedAddress: venue.formattedAddress || null,
        userRating: n(venue.userRating),
        userRatingCount: n(venue.userRatingCount),
        isBhPartner: Boolean(venue.isBhPartner),
        bhPartnerDealText: venue.bhPartnerDealText || null,
        minPerPlateCost: n(venue.price?.perPlate?.minValue),
        maxPerPlateCost: n(venue.price?.perPlate?.maxValue),
        minPerDayCost: n(venue.price?.perDay?.minValue),
        maxPerDayCost: n(venue.price?.perDay?.maxValue),
        minRoomCount: n(venue.rooms?.minValue),
        maxRoomCount: n(venue.rooms?.maxValue),
        minAreaCapacity: n(venue.capacity?.minValue),
        maxAreaCapacity: n(venue.capacity?.maxValue),
        parkingCount: n(venue.parkingCount),
        longitude: n(venue.coordinates?.[0]),
        latitude: n(venue.coordinates?.[1]),
        listingOrder: venue.listingOrder,
        listingPayload: venue,
        detailPayload: venue,
        searchText: venue.searchText
      },
      update: {
        name: venue.name,
        citySlug: venue.citySlug,
        shortAddress: venue.shortAddress || null,
        formattedAddress: venue.formattedAddress || null,
        userRating: n(venue.userRating),
        userRatingCount: n(venue.userRatingCount),
        isBhPartner: Boolean(venue.isBhPartner),
        listingOrder: venue.listingOrder,
        listingPayload: venue,
        detailPayload: venue,
        searchText: venue.searchText
      }
    });

    await prisma.venueMedia.deleteMany({ where: { venueId: venue.vendorId } });
    await prisma.venueTag.deleteMany({ where: { venueId: venue.vendorId } });
    await prisma.venueArea.deleteMany({ where: { venueId: venue.vendorId } });
    await prisma.venueAmenity.deleteMany({ where: { venueId: venue.vendorId } });
    await prisma.venueFacility.deleteMany({ where: { venueId: venue.vendorId } });

    if (venue.images?.length) {
      await prisma.venueMedia.createMany({
        data: venue.images.map((image, index) => ({
          venueId: venue.vendorId,
          originalUrl: image.originalUrl,
          localPath: image.url || null,
          mimeType: image.mimeType || null,
          mediaId: image.mediaId || null,
          source: image.source || "detail",
          position: index
        }))
      });
    }
    if (venue.tags?.length) {
      await prisma.venueTag.createMany({
        data: [...new Set(venue.tags)].map((label) => ({ venueId: venue.vendorId, label })),
        skipDuplicates: true
      });
    }
    if (venue.areasAvailable?.length) {
      await prisma.venueArea.createMany({
        data: venue.areasAvailable.map((area) => ({
          venueId: venue.vendorId,
          name: text(area) || "Available Area",
          areaType: area.type || area.areaType || null,
          seatingCapacity: n(area.seatingCapacity || area.seating),
          floatingCapacity: n(area.floatingCapacity || area.floating)
        }))
      });
    }
    const amenities = [...new Set((venue.amenities || []).map(text).filter(Boolean))];
    if (amenities.length) {
      await prisma.venueAmenity.createMany({
        data: amenities.map((label) => ({ venueId: venue.vendorId, label })),
        skipDuplicates: true
      });
    }
    const facilities = [...new Set((venue.facilities || []).map(text).filter(Boolean))];
    if (facilities.length) {
      await prisma.venueFacility.createMany({
        data: facilities.map((label) => ({ venueId: venue.vendorId, label })),
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
