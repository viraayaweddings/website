import type { Metadata } from "next";
import PhotographersClient from "./photographers-client";
import { getPhotographerCities, queryPhotographers } from "../lib/photographer-data";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Wedding Photographers in India - Candid & Cinematic | Viraaya Weddings",
  description:
    "Browse and book top wedding photographers across India with Viraaya Weddings - candid photography, cinematic films, pre-wedding shoots and more for every budget and style.",
  alternates: { canonical: "/wedding-photographers" },
  openGraph: {
    title: "Wedding Photographers in India | Viraaya Weddings",
    description:
      "Discover and book wedding photographers across India - candid, cinematic and traditional styles curated by Viraaya Weddings.",
    url: "/wedding-photographers",
    type: "website"
  }
};

export default async function WeddingPhotographersPage() {
  const initial = await queryPhotographers({ limit: "24", page: "1" });
  const cities = await getPhotographerCities();
  return <PhotographersClient initial={initial} cities={cities} />;
}
