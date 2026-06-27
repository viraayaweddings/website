import { notFound } from "next/navigation";
import PhotographersClient from "../photographers-client";
import { getPhotographerCities, queryPhotographers } from "../../lib/photographer-data";

export const dynamic = "force-dynamic";
export const revalidate = 900;

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
