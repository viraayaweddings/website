import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyPage, companyPageSlugs, type CompanySlug } from "../company-pages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const companyMeta: Record<CompanySlug, { title: string; description: string }> = {
  "careers": {
    title: "Careers - Join Our Team | Viraaya Weddings",
    description: "Explore career opportunities at Viraaya Weddings and help us craft unforgettable wedding experiences across India."
  },
  "contact-us": {
    title: "Contact Us | Viraaya Weddings",
    description: "Get in touch with Viraaya Weddings for wedding planning, venue bookings and vendor enquiries. We are here to help plan your perfect celebration."
  },
  "partner-onboarding-form": {
    title: "Become a Partner | Viraaya Weddings",
    description: "Partner with Viraaya Weddings. List your venue or wedding services and reach couples planning their big day across India."
  },
  "client-terms": {
    title: "Client Terms & Conditions | Viraaya Weddings",
    description: "Read the client terms and conditions for using Viraaya Weddings' wedding planning and booking services."
  },
  "vendor-terms": {
    title: "Vendor Terms & Conditions | Viraaya Weddings",
    description: "Read the vendor terms and conditions for partnering with Viraaya Weddings."
  },
  "privacy-policy": {
    title: "Privacy Policy | Viraaya Weddings",
    description: "Learn how Viraaya Weddings collects, uses and protects your personal information."
  },
  "refund-policy": {
    title: "Refund Policy | Viraaya Weddings",
    description: "Understand Viraaya Weddings' refund and cancellation policy for wedding services and bookings."
  },
  "about-us": {
    title: "About Us - Luxury Wedding Planning in India | Viraaya Weddings",
    description: "Learn about Viraaya Weddings, our trusted network of premium venues and wedding professionals, and how we craft memorable celebrations across India."
  },
  "wedding-invitation-card": {
    title: "Wedding Invitation Cards - Designs & Ideas | Viraaya Weddings",
    description: "Explore beautiful wedding invitation card designs and ideas with Viraaya Weddings to set the tone for your celebration."
  },
  "wedding": {
    title: "Wedding Planning Services | Viraaya Weddings",
    description: "End-to-end wedding planning with Viraaya Weddings - venues, decor, photography and more, curated for your perfect day."
  },
  "wedding-services": {
    title: "Wedding Services - End to End Planning | Viraaya Weddings",
    description: "Discover Viraaya Weddings' end-to-end wedding services - venue selection, decor, photography, beauty and full-event coordination across India."
  }
};

export function generateStaticParams() {
  return companyPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!(companyPageSlugs as readonly string[]).includes(slug)) return {};
  const meta = companyMeta[slug as CompanySlug];
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: meta.title, description: meta.description, url: `/${slug}`, type: "website" }
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  if (!(companyPageSlugs as readonly string[]).includes(slug)) {
    notFound();
  }

  return <CompanyPage slug={slug as CompanySlug} />;
}
