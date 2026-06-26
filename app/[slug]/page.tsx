import { notFound } from "next/navigation";
import { CompanyPage, companyPageSlugs, type CompanySlug } from "../company-pages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return companyPageSlugs.map((slug) => ({ slug }));
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  if (!(companyPageSlugs as readonly string[]).includes(slug)) {
    notFound();
  }

  return <CompanyPage slug={slug as CompanySlug} />;
}
