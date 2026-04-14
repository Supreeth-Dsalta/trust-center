export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  getCompanyPages,
  getCompanyPageByRouteSlug,
  getCompanySocialLinks,
} from "../../../../lib/companies";
import TrustCenterPage from "../../../../components/TrustCenterPage";

export default async function CompanyRoutePage({ params }) {
  const slug = params.slug;
  const pageSegments = params.page || [];
  const routeSlug = pageSegments.length ? pageSegments.join("/") : "overview";

  const company = await getCompanyBySlug(slug);

  if (!company) notFound();

  const allPages = await getCompanyPages(company.id);
  const currentPage = await getCompanyPageByRouteSlug(company.id, routeSlug);
  const socialLinks = await getCompanySocialLinks(company.id);

  if (!currentPage) notFound();

  return (
    <TrustCenterPage
      company={company}
      currentPage={currentPage}
      allPages={allPages}
      socialLinks={socialLinks}
    />
  );
}
