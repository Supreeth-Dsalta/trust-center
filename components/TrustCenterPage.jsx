"use client";

import React, { useMemo, useState } from "react";

const GROUP_ORDER = [
  "OVERVIEW",
  "COMPLIANCE & SECURITY",
  "ASSESSMENT",
  "VENDOR INTELLIGENCE",
  "RESOURCES",
  "OTHER",
];

const COMPLIANCE_LOGOS = {
  soc2: "https://ordr.net/wp-content/uploads/2024/02/itemeditorimage_61c4ad49a0311.webp",
  iso27001:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi1PrlV6apvxfQ1PUBOR4fcHkRJLht-CJGDg&s",
  gdpr: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlnSBKzfJExE2OJF_ll5TD8yO0htKKz9yXaw&s",
  hipaa:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3Mnq09CMBxTBZWNJAiR-vZ0Ka5o37AU7utg&s",
};

function safeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function pageHref(companySlug, routeSlug) {
  return routeSlug === "overview"
    ? `/company/${companySlug}`
    : `/company/${companySlug}/${routeSlug}`;
}

function groupTitle(groupName) {
  return groupName || "OTHER";
}

function shouldOpenGroup(groupName, currentGroup) {
  if (!groupName) return false;
  return groupName === currentGroup || groupName === "OVERVIEW";
}

function orderedGroupEntries(allPages) {
  const groups = {};

  for (const page of allPages || []) {
    const key = page.nav_group || "OTHER";
    if (!groups[key]) groups[key] = [];
    groups[key].push(page);
  }

  Object.values(groups).forEach((pages) => {
    pages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  const known = GROUP_ORDER.filter((name) => groups[name]);
  const unknown = Object.keys(groups)
    .filter((name) => !GROUP_ORDER.includes(name))
    .sort();

  return [...known, ...unknown].map((name) => [name, groups[name]]);
}

function findAdjacentPages(allPages, currentRouteSlug) {
  const ordered = [...(allPages || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const index = ordered.findIndex(
    (page) => page.route_slug === currentRouteSlug
  );

  return {
    prevPage: index > 0 ? ordered[index - 1] : null,
    nextPage:
      index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

function getInitials(name) {
  return (
    name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TC"
  );
}

function getComplianceLogo(name = "") {
  const value = String(name).toLowerCase();

  if (value.includes("soc 2") || value.includes("soc2")) {
    return COMPLIANCE_LOGOS.soc2;
  }
  if (
    value.includes("iso 27001") ||
    value.includes("iso27001") ||
    value.includes("iso 27")
  ) {
    return COMPLIANCE_LOGOS.iso27001;
  }
  if (value.includes("gdpr")) {
    return COMPLIANCE_LOGOS.gdpr;
  }
  if (value.includes("hipaa") || value.includes("hippa")) {
    return COMPLIANCE_LOGOS.hipaa;
  }

  return null;
}

function sectionText(section) {
  if (!section) return "";

  const parts = [section.type, section.heading, section.card, section.content];

  if (section.fields) {
    for (const [key, value] of Object.entries(section.fields)) {
      parts.push(key);
      parts.push(value?.value);
      parts.push(value?.source);
      parts.push(value?.confidence);
    }
  }

  if (section.badges) {
    section.badges.forEach((badge) => {
      parts.push(badge.name, badge.confidence, badge.info_text, badge.year);
    });
  }

  if (section.items) {
    section.items.forEach((item) => {
      parts.push(
        item.title,
        item.item,
        item.name,
        item.summary,
        item.detail,
        item.detail_text,
        item.confidence,
        item.status
      );
    });
  }

  if (section.leaders) {
    section.leaders.forEach((leader) => {
      parts.push(leader.name, leader.title, leader.background);
    });
  }

  if (section.subprocessors) {
    section.subprocessors.forEach((item) => {
      parts.push(
        item.service,
        item.purpose,
        item.location,
        item.status,
        item.confidence
      );
    });
  }

  if (section.cards) {
    section.cards.forEach((card) => {
      parts.push(
        card.header,
        card.detail,
        card.status,
        card.category,
        card.finding,
        card.severity
      );
    });
  }

  if (section.categories) {
    section.categories.forEach((category) => {
      parts.push(category.category);
      (category.technologies || []).forEach((tech) => {
        parts.push(tech.name);
      });
    });
  }

  if (section.materials) {
    section.materials.forEach((item) => {
      parts.push(item.name, item.url);
    });
  }

  if (section.faqs) {
    section.faqs.forEach((faq) => {
      parts.push(faq.question, faq.answer, faq.confidence);
    });
  }

  return parts.filter(Boolean).join(" ").toLowerCase();
}

function faqMatches(faq, query) {
  if (!query) return true;
  const haystack = `${faq.question || ""} ${faq.answer || ""} ${
    faq.confidence || ""
  }`
    .toLowerCase()
    .trim();
  return haystack.includes(query);
}

function SearchBox({ value, onChange, resultsCount }) {
  return (
    <div className="tc-search">
      <span className="tc-search-icon">⌕</span>
      <input
        className="tc-search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search this page"
      />
      {value ? <span className="tc-search-count">{resultsCount}</span> : null}
    </div>
  );
}

function DsaltaMark() {
  return (
    <span className="tc-dsalta-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="tc-dsalta-mark-svg">
        <rect
          x="4"
          y="5"
          width="12"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M14.5 3.8v4.2h4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 8l2.5-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function CompanyHeaderIcon() {
  return (
    <span className="tc-company-header-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="tc-company-header-icon-svg">
        <rect
          x="4"
          y="7"
          width="16"
          height="12"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  );
}

function InfoBadge({ children, tone = "neutral" }) {
  return <span className={`tc-badge tc-badge-${tone}`}>{children}</span>;
}

function getBadgeTone(value) {
  const text = String(value || "").toLowerCase();

  if (
    text.includes("verified") ||
    text.includes("confirmed") ||
    text.includes("pass") ||
    text.includes("active") ||
    text.includes("low risk")
  ) {
    return "green";
  }

  if (
    text.includes("stated") ||
    text.includes("detected") ||
    text.includes("medium") ||
    text.includes("in progress") ||
    text.includes("issue")
  ) {
    return "yellow";
  }

  if (
    text.includes("not found") ||
    text.includes("high risk") ||
    text.includes("fail")
  ) {
    return "red";
  }

  return "neutral";
}

function FaqAccordion({ faqs = [] }) {
  if (!faqs.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">Frequently Asked</h2>
      <div className="tc-faq-list">
        {faqs.map((faq, index) => (
          <details
            key={`${faq.question}-${index}`}
            open={index === 0}
            className="tc-faq-item"
          >
            <summary className="tc-faq-question">
              <span>{faq.question}</span>
              <span className="tc-faq-chevron">⌄</span>
            </summary>

            <div className="tc-faq-answer">
              <p>{faq.answer}</p>
              {faq.confidence ? (
                <InfoBadge tone={getBadgeTone(faq.confidence)}>
                  {faq.confidence}
                </InfoBadge>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function SectionRenderer({ section, company }) {
  if (!section || !section.type) return null;

  switch (section.type) {
    case "hero":
      return (
        <section className="tc-hero">
          <div className="tc-hero-logo-wrap">
            <div className="tc-company-icon">
              {getInitials(company.display_name)}
            </div>
          </div>

          <div className="tc-hero-copy">
            <h1>{company.display_name}</h1>
            <p>
              {section.content ||
                company.description_short ||
                company.description_long ||
                "Company trust center profile."}
            </p>
          </div>

          <div className="tc-scan-pill">
            <span className="tc-scan-dot" />
            <span>
              Last scanned{" "}
              {company.scan_date
                ? new Date(company.scan_date).toLocaleDateString()
                : "recently"}
            </span>
          </div>
        </section>
      );

    case "company_profile_grid": {
      const fields = section.fields || {};
      const entries = Object.entries(fields);

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Company Profile</h2>
          <div className="tc-grid tc-grid-4">
            {entries.map(([label, field]) => (
              <div className="tc-card" key={label}>
                <div className="tc-card-label">
                  {label.replaceAll("_", " ")}
                </div>
                <div className="tc-card-value">{field?.value || "—"}</div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "badge_row": {
      const badges = section.badges || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Compliance Status</h2>
          <div className="tc-badge-grid">
            {badges.map((badge, index) => {
              const logoUrl = badge.logo_url || getComplianceLogo(badge.name);

              return (
                <div
                  className="tc-badge-card tc-badge-card-hover"
                  key={`${badge.name}-${index}`}
                >
                  <div className="tc-badge-logo-wrap">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={badge.name}
                        className="tc-badge-logo"
                      />
                    ) : (
                      <div className="tc-badge-circle">
                        {(badge.name || "").slice(0, 6)}
                      </div>
                    )}
                  </div>

                  <div className="tc-badge-name">{badge.name}</div>
                  <div className="tc-badge-year">
                    {badge.year || badge.subtext || badge.confidence || ""}
                  </div>

                  <div className="tc-badge-tooltip">
                    <div className="tc-badge-tooltip-title">{badge.name}</div>
                    <div className="tc-badge-tooltip-text">
                      {badge.info_text ||
                        badge.description ||
                        "No additional compliance details available."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "posture_card":
      return (
        <div className="tc-feature-card">
          <div className="tc-feature-card-top">
            <h3>{section.card}</h3>
            {section.confidence ? (
              <InfoBadge tone={getBadgeTone(section.confidence)}>
                {section.confidence}
              </InfoBadge>
            ) : null}
          </div>
          <p>{section.content}</p>
          {section.source ? <small>{section.source}</small> : null}
        </div>
      );

    case "founder_cards": {
      const leaders = section.leaders || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Founders</h2>
          <div className="tc-grid tc-grid-2">
            {leaders.map((leader, index) => (
              <div className="tc-person-card" key={`${leader.name}-${index}`}>
                <div className="tc-person-avatar">
                  {leader.name
                    ?.split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <div>
                  <div className="tc-person-name">{leader.name}</div>
                  <div className="tc-person-title">{leader.title}</div>
                  {leader.background ? (
                    <div className="tc-person-meta">{leader.background}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "confirmed_items":
    case "confirmed_capabilities":
    case "not_confirmed_items":
    case "not_confirmed_capabilities": {
      const items = section.items || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">{section.heading || "Details"}</h2>
          <div className="tc-grid tc-grid-2">
            {items.map((item, index) => (
              <div className="tc-card" key={index}>
                <div className="tc-card-row">
                  <div className="tc-card-value">
                    {item.title || item.item || item.name}
                  </div>

                  {item.confidence ? (
                    <InfoBadge tone={getBadgeTone(item.confidence)}>
                      {item.confidence}
                    </InfoBadge>
                  ) : null}
                </div>

                <div className="tc-card-text">
                  {item.detail || item.detail_text || ""}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "published_policies":
    case "not_found_policies": {
      const items = section.items || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">{section.heading || "Policies"}</h2>
          <div className="tc-grid tc-grid-2">
            {items.map((item, index) => (
              <div className="tc-card" key={index}>
                <div className="tc-card-row">
                  <div className="tc-card-value">{item.name}</div>
                  {item.confidence ? (
                    <InfoBadge tone={getBadgeTone(item.confidence)}>
                      {item.confidence}
                    </InfoBadge>
                  ) : null}
                </div>

                <div className="tc-card-text">
                  {item.summary || item.detail || ""}
                </div>

                {item.url ? (
                  <a
                    className="tc-link"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "subprocessor_table": {
      const subprocessors = section.subprocessors || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Subprocessors</h2>

          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Purpose</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>

              <tbody>
                {subprocessors.map((item, index) => (
                  <tr key={`${item.service}-${index}`}>
                    <td>{item.service}</td>
                    <td>{item.purpose}</td>
                    <td>{item.location || "—"}</td>
                    <td>{item.status || "—"}</td>
                    <td>{item.confidence || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    case "timeline": {
      const items = section.items || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Security Incident History</h2>
          <div className="tc-stack">
            {items.map((item, index) => (
              <div className="tc-card" key={index}>
                <div className="tc-card-row">
                  <div className="tc-card-value">{item.title}</div>
                  {item.date ? <InfoBadge>{item.date}</InfoBadge> : null}
                </div>
                <div className="tc-card-text">
                  {item.summary || item.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "website_security_cards": {
      const cards = section.cards || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">
            {section.heading || "Website Scan"}
          </h2>

          <div className="tc-grid tc-grid-2">
            {cards.map((card, index) => (
              <div className="tc-card" key={index}>
                <div className="tc-card-row">
                  <div className="tc-card-value">{card.header}</div>
                  {card.status ? (
                    <InfoBadge tone={getBadgeTone(card.status)}>
                      {card.status}
                    </InfoBadge>
                  ) : null}
                </div>

                <div className="tc-card-text">{card.detail}</div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "tech_categories": {
      const categories = section.categories || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Integrations & Tech Stack</h2>

          <div className="tc-grid tc-grid-2">
            {categories.map((category, index) => (
              <div className="tc-card" key={index}>
                <div className="tc-card-value">{category.category}</div>

                <div className="tc-chip-wrap">
                  {(category.technologies || []).map((tech, chipIndex) => (
                    <span className="tc-chip" key={`${tech.name}-${chipIndex}`}>
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "assessment_cards": {
      const cards = section.cards || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">Assessment Findings</h2>

          <div className="tc-grid tc-grid-2">
            {cards.map((card, index) => (
              <div className="tc-card" key={index}>
                <div className="tc-card-row">
                  <div className="tc-card-value">{card.category}</div>
                  {card.severity ? (
                    <InfoBadge tone={getBadgeTone(card.severity)}>
                      {card.severity}
                    </InfoBadge>
                  ) : null}
                </div>

                <div className="tc-card-text">{card.finding}</div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "questionnaire_cta":
      return (
        <section className="tc-section">
          <div className="tc-cta-card">
            <div>
              <h3>Security Questionnaire</h3>
              <p>{section.content}</p>
            </div>

            <button className="tc-primary-btn">Send Questionnaire</button>
          </div>
        </section>
      );

    case "available_materials": {
      const materials = section.materials || [];

      return (
        <section className="tc-section">
          <h2 className="tc-section-title">
            {section.heading || "Available Materials"}
          </h2>

          <div className="tc-grid tc-grid-2">
            {materials.map((item, index) => (
              <a
                className="tc-card tc-card-link"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                key={`${item.name}-${index}`}
              >
                <div className="tc-card-value">{item.name}</div>
                <div className="tc-card-text">{item.url}</div>
              </a>
            ))}
          </div>
        </section>
      );
    }

    case "faq_list":
      return <FaqAccordion faqs={section.faqs || []} />;

    case "note":
    case "callout":
      return (
        <section className="tc-section">
          <div className="tc-note">{section.content}</div>
        </section>
      );

    default:
      return (
        <section className="tc-section">
          <div className="tc-card">
            <div className="tc-card-value">{section.type}</div>
            <pre className="tc-pre">{JSON.stringify(section, null, 2)}</pre>
          </div>
        </section>
      );
  }
}

export default function TrustCenterPage({ company, currentPage, allPages }) {
  const [searchQuery, setSearchQuery] = useState("");

  const groupEntries = orderedGroupEntries(allPages);
  const sections = safeJson(currentPage.sections_json, []);
  const faqs = safeJson(currentPage.faqs_json, []);
  const { prevPage, nextPage } = findAdjacentPages(
    allPages,
    currentPage.route_slug
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!query) return sections;
    return sections.filter((section) => sectionText(section).includes(query));
  }, [sections, query]);

  const filteredFaqs = useMemo(() => {
    if (!query) return faqs;
    return faqs.filter((faq) => faqMatches(faq, query));
  }, [faqs, query]);

  const resultCount = filteredSections.length + filteredFaqs.length;

  const prevHref = prevPage
    ? pageHref(company.slug, prevPage.route_slug)
    : null;
  const nextHref = nextPage
    ? pageHref(company.slug, nextPage.route_slug)
    : null;

  return (
    <div className="tc-shell">
      <div className="tc-topbar">
        <div className="tc-topbar-inner">
          <div className="tc-topbar-brand">
            <DsaltaMark />
            <span className="tc-topbar-brand-text">Generated by DSALTA®</span>
          </div>

          <div className="tc-topbar-divider" />

          <a
            className="tc-topbar-link"
            href="https://www.dsalta.com/"
            target="_blank"
            rel="noreferrer"
          >
            Get your free trust center
          </a>

          <a className="tc-topbar-btn" href="#">
            Claim this page <span className="tc-btn-arrow">→</span>
          </a>
        </div>
      </div>

      <div className="tc-page">
        <div className="tc-header">
          <div className="tc-header-left">
            <CompanyHeaderIcon />
            <div className="tc-header-company">{company.display_name}</div>
          </div>

          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            resultsCount={resultCount}
          />
        </div>

        <div className="tc-body">
          <aside className="tc-sidebar">
            {groupEntries.map(([groupName, pages]) => (
              <details
                key={groupName}
                className="tc-sidebar-group"
                open={shouldOpenGroup(groupName, currentPage.nav_group)}
              >
                <summary className="tc-sidebar-summary">
                  <span className="tc-sidebar-title">
                    {groupTitle(groupName)}
                  </span>
                  <span className="tc-sidebar-summary-icon">−</span>
                </summary>

                <div className="tc-sidebar-links">
                  {pages.map((page) => {
                    const active = page.route_slug === currentPage.route_slug;

                    return (
                      <a
                        key={page.id}
                        href={pageHref(company.slug, page.route_slug)}
                        className={`tc-sidebar-link ${
                          active ? "is-active" : ""
                        }`}
                      >
                        <span>{page.nav_label || page.title}</span>
                        {groupName === "VENDOR INTELLIGENCE" ? (
                          <span className="tc-sidebar-link-arrow">↗</span>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              </details>
            ))}

            <div className="tc-quick-actions">
              <div className="tc-sidebar-title">Quick Actions</div>
              <a className="tc-qa-link" href="#">
                Send Questionnaire
              </a>
              <a className="tc-qa-link" href="#">
                Request Documents
              </a>
              <a className="tc-qa-link" href="#">
                Get Risk Report
              </a>
              <a className="tc-qa-link" href="#">
                Contact Security
              </a>
            </div>
          </aside>

          <main className="tc-main">
            <div className="tc-breadcrumbs">
              <span>
                {currentPage.nav_group === "OVERVIEW"
                  ? "Overview"
                  : currentPage.nav_group || "Section"}
              </span>
              <span>›</span>
              <span>{currentPage.nav_label || currentPage.title}</span>
            </div>

            {filteredSections.map((section, index) => (
              <SectionRenderer
                key={`${section.type}-${index}`}
                section={section}
                company={company}
              />
            ))}

            {!filteredSections.length && !filteredFaqs.length ? (
              <section className="tc-section">
                <div className="tc-card">
                  <div className="tc-card-value">No results found</div>
                  <div className="tc-card-text">
                    Try a different keyword for this page.
                  </div>
                </div>
              </section>
            ) : null}

            {!query && !sections.length ? (
              <section className="tc-section">
                <div className="tc-card">
                  <div className="tc-card-value">{currentPage.title}</div>
                  <div className="tc-card-text">{currentPage.description}</div>
                </div>
              </section>
            ) : null}

            <FaqAccordion faqs={filteredFaqs} />

            <div className="tc-nav-footer">
              <div>
                {prevHref ? (
                  <a className="tc-nav-btn is-muted" href={prevHref}>
                    <span className="tc-nav-btn-meta">PREVIOUS</span>
                    <span>{prevPage.nav_label || prevPage.title}</span>
                  </a>
                ) : (
                  <span />
                )}
              </div>

              <div>
                {nextHref ? (
                  <a className="tc-nav-btn" href={nextHref}>
                    <span className="tc-nav-btn-meta">NEXT</span>
                    <span>{nextPage.nav_label || nextPage.title}</span>
                  </a>
                ) : null}
              </div>
            </div>
          </main>
        </div>

        <footer className="tc-footer">
          <div className="tc-footer-left">
            <DsaltaMark />
            <span>Powered by DSALTA®</span>
          </div>

          <div className="tc-footer-right">
            <a href="#">Report an issue</a>
            <a href="https://www.dsalta.com/" target="_blank" rel="noreferrer">
              Get your free security page
            </a>
            <a href="#">Claim this page</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
