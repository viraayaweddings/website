import VenuesClient from "./venues-client";
import { getVenueCities, queryVenues } from "../lib/venue-data";

export const dynamic = "force-dynamic";

export default async function WeddingVenuesPage() {
  const initial = await queryVenues({ limit: "24", page: "1" });
  const cities = await getVenueCities();
  return <VenuesClient initial={initial} cities={cities} />;
}
