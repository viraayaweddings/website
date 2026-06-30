import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PhotographersClient from "../photographers-client";
import { getPhotographerCities, queryPhotographers } from "../../lib/photographer-data";
import { allowedCityName, isAllowedCitySlug } from "../../lib/allowed-cities";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export async function generateMetadata({
  params
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  if (!isAllowedCitySlug(city)) return {};
  const cityName = allowedCityName(city);
  const canonical = `/wedding-photographers/${city.toLowerCase()}`;
  const title = `Wedding Photographers in ${cityName} - Candid & Cinematic | Viraaya Weddings`;
  const description = `Find and book the best wedding photographers in ${cityName} with Viraaya Weddings - candid photography, cinematic films and pre-wedding shoots for every budget and style.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" }
  };
}

export default async function PhotographerCityPage({
  params
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const initial = await queryPhotographers({ city, limit: "24", page: "1" });
  if (initial.size === 0) {
    notFound();
  }
  const cities = await getPhotographerCities();
  return <PhotographersClient initial={initial} cities={cities} citySlug={city} />;
}
