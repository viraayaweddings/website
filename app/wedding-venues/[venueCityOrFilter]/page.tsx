import { notFound } from "next/navigation";
import VenuesClient from "../venues-client";
import { getCityBySlug, getVenueCities, queryVenues, supportedVenueCities } from "../../lib/venue-data";

export const dynamic = "force-dynamic";

export default async function WeddingVenuesCityPage({
  params
}: {
  params: Promise<{ venueCityOrFilter: string }>;
}) {
  const { venueCityOrFilter } = await params;
  const citySlug = venueCityOrFilter.toLowerCase();
  if (!supportedVenueCities.includes(citySlug) || !(await getCityBySlug(citySlug))) {
    notFound();
  }
  const initial = await queryVenues({ city: citySlug, limit: "24", page: "1" });
  return <VenuesClient initial={initial} citySlug={citySlug} cities={await getVenueCities()} />;
}
