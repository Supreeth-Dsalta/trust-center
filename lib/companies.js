import { sql } from './db';

export async function getCompanyBySlug(slug) {
  const rows = await sql`
    SELECT *
    FROM companies
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function getCompanyPages(companyId) {
  return await sql`
    SELECT *
    FROM company_pages
    WHERE company_id = ${companyId}
      AND included = true
    ORDER BY sort_order ASC
  `;
}

export async function getCompanyPageByRouteSlug(companyId, routeSlug) {
  const rows = await sql`
    SELECT *
    FROM company_pages
    WHERE company_id = ${companyId}
      AND route_slug = ${routeSlug}
      AND included = true
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function getCompanySocialLinks(companyId) {
  return await sql`
    SELECT *
    FROM company_social_links
    WHERE company_id = ${companyId}
    ORDER BY sort_order ASC
  `;
}