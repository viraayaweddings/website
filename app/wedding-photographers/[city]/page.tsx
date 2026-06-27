import { notFound } from "next/navigation";
import PhotographersClient from "../photographers-client";
import { getPhotographerCities, queryPhotographers, supportedPhotographerCities } from "../../lib/photographer-data";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export default async function PhotographerCityPage({
  params
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  if (!supportedPhotographerCities.includes(city.toLowerCase())) {
    notFound();
  }
  const initial = await queryPhotographers({ city, limit: "24", page: "1" });
  const cities = await getPhotographerCities();
  return <PhotographersClient initial={initial} cities={cities} citySlug={city} />;
}
