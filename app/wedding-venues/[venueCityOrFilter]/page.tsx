import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VenuesClient from "../venues-client";
import { getCityBySlug, getVenueCities, queryVenues } from "../../lib/venue-data";
import { allowedCityName, isAllowedCitySlug } from "../../lib/allowed-cities";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export async function generateMetadata({
  params
}: {
  params: Promise<{ venueCityOrFilter: string }>;
}): Promise<Metadata> {
  const { venueCityOrFilter } = await params;
  if (!isAllowedCitySlug(venueCityOrFilter)) return {};
  const cityName = allowedCityName(venueCityOrFilter);
  const canonical = `/wedding-venues/${venueCityOrFilter.toLowerCase()}`;
  const title = `Wedding Venues in ${cityName} - Banquet Halls, Hotels & Resorts | Viraaya Weddings`;
  const description = `Find and book the best wedding venues in ${cityName} with Viraaya Weddings - banquet halls, hotels, resorts and farmhouses for weddings, receptions and engagements.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" }
  };
}

export default async function WeddingVenuesCityPage({
  params
}: {
  params: Promise<{ venueCityOrFilter: string }>;
}) {
  const { venueCityOrFilter } = await params;
  const citySlug = venueCityOrFilter.toLowerCase();
  if (!(await getCityBySlug(citySlug))) {
    notFound();
  }
  const initial = await queryVenues({ city: citySlug, limit: "24", page: "1" });
  return <VenuesClient initial={initial} citySlug={citySlug} cities={await getVenueCities()} />;
}
