import type { Metadata } from "next";
import VenuesClient from "./venues-client";
import { getVenueCities, queryVenues } from "../lib/venue-data";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Wedding Venues in India - Banquet Halls, Hotels & Resorts | Viraaya Weddings",
  description:
    "Explore and book the best wedding venues across India with Viraaya Weddings - banquet halls, luxury hotels, resorts, farmhouses and destination venues for every guest count and style.",
  alternates: { canonical: "/wedding-venues" },
  openGraph: {
    title: "Wedding Venues in India | Viraaya Weddings",
    description:
      "Discover and book wedding venues across India - banquet halls, hotels, resorts and farmhouses curated by Viraaya Weddings.",
    url: "/wedding-venues",
    type: "website"
  }
};

export default async function WeddingVenuesPage() {
  const initial = await queryVenues({ limit: "24", page: "1" });
  const cities = await getVenueCities();
  return <VenuesClient initial={initial} cities={cities} />;
}
