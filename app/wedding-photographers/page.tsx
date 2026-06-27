import PhotographersClient from "./photographers-client";
import { getPhotographerCities, queryPhotographers } from "../lib/photographer-data";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export default async function WeddingPhotographersPage() {
  const initial = await queryPhotographers({ limit: "24", page: "1" });
  const cities = await getPhotographerCities();
  return <PhotographersClient initial={initial} cities={cities} />;
}
