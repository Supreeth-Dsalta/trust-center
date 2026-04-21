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
const DSALTA_SIGNUP_URL = "https://app.dsalta.com/signup";
const CLAIM_PAGE_URL = "https://forms.gle/nNNVpyiM2eg2p2y67";
const REMOTE_DSALTA_LOGO =
  "https://images.g2crowd.com/uploads/product/image/61057733310a5312095b1d55240c51ce/dsalta.png";

const complianceAsset = (filename) =>
  `/compliance/${encodeURIComponent(filename)}`;

const COMPLIANCE_FILE_RULES = [
  { test: /21\s*cfr|part\s*11/i, file: "21-CFR-Part-11-Compliance.jpg" },
  { test: /23\s*nycrr/i, file: "23 NYCRR 500.webp" },
  { test: /australian\s*dpa/i, file: "australian_dpa.png" },
  { test: /\bcis\b/i, file: "cis.png" },
  { test: /cmmc/i, file: "cmmc.png" },
  { test: /coso/i, file: "COSO.png" },
  { test: /cpra/i, file: "cpra.png" },
  { test: /\bcsa\b|star/i, file: "csa.png" },
  { test: /cyber essentials plus/i, file: "cyber_essentials_plus.png" },
  { test: /cyber essentials/i, file: "Cyber Essentials logo small.webp" },
  { test: /\bdora\b/i, file: "DORA.png" },
  { test: /eu ai act/i, file: "EU AI Act.png" },
  { test: /fedramp/i, file: "fedramp.png" },
  { test: /\bgdpr\b/i, file: "gdpr.png" },
  { test: /hipaa/i, file: "hipaa.png" },
  { test: /hitrust/i, file: "HITRUST_Logo.jpg" },
  { test: /iso\s*27001|\biso\b/i, file: "ISO.png" },
  { test: /microsoft.*sspa|sspa/i, file: "microsoft_sspa.png" },
  { test: /nis\s*2|nis2/i, file: "NIS2.png" },
  { test: /nist\s*800[- ]?171/i, file: "NIST-800-171-r2.png" },
  { test: /nist|rmf/i, file: "nist.png" },
  { test: /pci[- ]?dss|pci/i, file: "pci_dss.png" },
  { test: /pipeda/i, file: "pipeda.png" },
  { test: /privacy essentials/i, file: "privacy_essentials.png" },
  { test: /rbi/i, file: "rbi_sar.png" },
  { test: /\bsama\b/i, file: "SAMA_logo_en.png" },
  { test: /soc\s*2|soc2/i, file: "soc2.png" },
  { test: /tipa/i, file: "TIPA (Tennessee).jpg" },
  { test: /tisax/i, file: "tisax.png" },
  { test: /uk\s*gdpr/i, file: "UK GDPR.png" },
  { test: /ferpa/i, file: "us_ferpa.png" },
  { test: /\bsox\b/i, file: "us_sox.png" },
  { test: /tx ramp|us_tx_ramp/i, file: "US_TX_RAMP.png" },
];

function safeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toArray(value) {
  const parsed = safeJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function pageHref(companySlug, routeSlug) {
  return routeSlug === "overview"
    ? `/company/${companySlug}`
    : `/company/${companySlug}/${routeSlug}`;
}

function orderedGroupEntries(allPages) {
  const groups = {};

  for (const page of allPages || []) {
    const key = page.nav_group || "OTHER";
    if (!groups[key]) groups[key] = [];
    groups[key].push(page);
  }

  Object.values(groups).forEach((pages) => {
    pages.sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        String(a.nav_label || a.title || "").localeCompare(
          String(b.nav_label || b.title || ""),
        ),
    );
  });

  const known = GROUP_ORDER.filter((name) => groups[name]);
  const unknown = Object.keys(groups)
    .filter((name) => !GROUP_ORDER.includes(name))
    .sort();

  return [...known, ...unknown].map((name) => [name, groups[name]]);
}

function findAdjacentPages(allPages, currentRouteSlug) {
  const ordered = [...(allPages || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
  );
  const index = ordered.findIndex(
    (page) => page.route_slug === currentRouteSlug,
  );

  return {
    prevPage: index > 0 ? ordered[index - 1] : null,
    nextPage:
      index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

function shouldOpenGroup(groupName, currentGroup) {
  if (!groupName) return false;
  return groupName === currentGroup || groupName === "OVERVIEW";
}

function groupTitle(groupName) {
  return groupName || "OTHER";
}

function breadcrumbGroupLabel(groupName) {
  if (!groupName || groupName === "OVERVIEW") return "Overview";
  if (groupName === "COMPLIANCE & SECURITY") return "Compliance & Security";
  if (groupName === "VENDOR INTELLIGENCE") return "Vendor Intelligence";
  return groupName;
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

function formatScanDate(scanDate) {
  if (!scanDate) return "recently";

  try {
    return new Date(scanDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "recently";
  }
}

function cleanPageTitle(company, currentPage) {
  const nav = currentPage?.nav_label?.trim();
  if (nav) return nav;

  const raw = currentPage?.title?.trim() || "";
  const companyName = company?.display_name?.trim() || "";

  if (companyName && raw.toLowerCase().startsWith(companyName.toLowerCase())) {
    return (
      raw
        .slice(companyName.length)
        .trim()
        .replace(/^[-–—:\s]+/, "") || raw
    );
  }

  return raw || "Trust Center";
}

function sectionText(section) {
  if (!section) return "";

  const parts = [
    section.type,
    section.heading,
    section.card,
    section.content,
    section.title,
    section.description,
  ];

  if (section.fields) {
    for (const [key, value] of Object.entries(section.fields)) {
      parts.push(key, value?.value, value?.source, value?.confidence);
    }
  }

  if (section.badges) {
    section.badges.forEach((badge) => {
      parts.push(
        badge.name,
        badge.status,
        badge.state,
        badge.phase,
        badge.confidence,
        badge.info_text,
        badge.description,
        badge.year,
      );
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
        item.finding,
        item.confidence,
        item.status,
        item.severity,
        item.url,
        item.source,
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
        item.confidence,
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
        card.severity,
      );
    });
  }

  if (section.categories) {
    section.categories.forEach((category) => {
      parts.push(category.category);
      (category.technologies || []).forEach((tech) => parts.push(tech.name));
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

function groupSections(sections) {
  const result = [];

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];

    if (section?.type === "posture_card") {
      const cards = [];
      while (i < sections.length && sections[i]?.type === "posture_card") {
        cards.push(sections[i]);
        i += 1;
      }
      i -= 1;
      result.push({
        type: "posture_card_group",
        heading: "Security Posture",
        cards,
      });
      continue;
    }

    result.push(section);
  }

  return result;
}

function getBadgeTone(value) {
  const text = String(value || "").toLowerCase();

  if (
    text.includes("verified") ||
    text.includes("confirmed") ||
    text.includes("pass") ||
    text.includes("passed") ||
    text.includes("active") ||
    text.includes("available") ||
    text.includes("low risk") ||
    text.includes("valid") ||
    text.includes("compliant")
  ) {
    return "green";
  }

  if (
    text.includes("stated") ||
    text.includes("detected") ||
    text.includes("medium") ||
    text.includes("in progress") ||
    text.includes("pending") ||
    text.includes("issue") ||
    text.includes("warning")
  ) {
    return "yellow";
  }

  if (
    text.includes("not found") ||
    text.includes("inactive") ||
    text.includes("expired") ||
    text.includes("revoked") ||
    text.includes("high risk") ||
    text.includes("fail")
  ) {
    return "red";
  }

  return "neutral";
}

function isComplianceActiveOrInProgress(badge = {}) {
  const haystack = [
    badge.status,
    badge.state,
    badge.phase,
    badge.confidence,
    badge.subtext,
    badge.year,
    badge.label,
    badge.info_text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) return true;

  if (
    haystack.includes("not found") ||
    haystack.includes("inactive") ||
    haystack.includes("expired") ||
    haystack.includes("revoked") ||
    haystack.includes("removed")
  ) {
    return false;
  }

  return (
    haystack.includes("active") ||
    haystack.includes("verified") ||
    haystack.includes("confirmed") ||
    haystack.includes("stated") ||
    haystack.includes("pass") ||
    haystack.includes("in progress") ||
    haystack.includes("progress") ||
    haystack.includes("pending") ||
    haystack.includes("current") ||
    haystack.includes("detected")
  );
}

function getComplianceLogo(badge = {}) {
  const name = String(badge.name || "");
  const explicit =
    badge.logo_url ||
    badge.logo ||
    badge.image ||
    badge.image_url ||
    badge.icon ||
    badge.asset_url;

  const match = COMPLIANCE_FILE_RULES.find((rule) => rule.test.test(name));
  if (match) return complianceAsset(match.file);

  return explicit || null;
}

function cardPrimaryText(item) {
  return (
    item.title ||
    item.item ||
    item.name ||
    item.header ||
    item.category ||
    item.service ||
    "Untitled"
  );
}

function cardSecondaryText(item) {
  return (
    item.detail ||
    item.detail_text ||
    item.summary ||
    item.finding ||
    item.content ||
    item.background ||
    ""
  );
}

function cardStatusText(item) {
  return item.confidence || item.status || item.severity || "";
}

function cardSourceText(item) {
  return item.source || item.url || "";
}

function resolveAction(item, sectionType) {
  if (item.action_label && item.action_href) {
    return { label: item.action_label, href: item.action_href };
  }

  if (item.url) {
    return { label: "Open", href: item.url, external: true };
  }

  if (sectionType === "not_found_policies") {
    return { label: "Request", href: "#" };
  }

  if (
    sectionType === "published_policies" &&
    /request/i.test(`${item.summary || ""} ${item.detail || ""}`)
  ) {
    return { label: "Request", href: "#" };
  }

  return null;
}

function SmartAnchor({
  href,
  className,
  children,
  external = false,
  ...props
}) {
  const isExternal =
    external || /^(https?:|mailto:|tel:)/i.test(String(href || ""));

  return (
    <a
      href={href || "#"}
      className={className}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="tc-icon-svg" aria-hidden="true">
      <circle
        cx="8.5"
        cy="8.5"
        r="4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 12l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" className="tc-inline-icon" aria-hidden="true">
      <path
        d="M5 10h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M10.5 5.5L15 10l-4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="tc-inline-icon" aria-hidden="true">
      <path
        d="M15 10H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9.5 5.5L5 10l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="tc-inline-icon tc-inline-icon-xs"
      aria-hidden="true"
    >
      <path
        d="M7 4.5L12.5 10 7 15.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="tc-inline-icon tc-inline-icon-sm"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10 8.5v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.1" r="0.9" fill="currentColor" />
    </svg>
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

function DsaltaMark() {
  return (
    <span className="tc-dsalta-mark" aria-hidden="true">
      <img
        src="/dsalta-logo.png"
        alt=""
        className="tc-dsalta-mark-img"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = REMOTE_DSALTA_LOGO;
        }}
      />
    </span>
  );
}

function QuickActionIcon({ kind }) {
  if (kind === "questionnaire") {
    return (
      <svg viewBox="0 0 20 20" className="tc-qa-icon" aria-hidden="true">
        <path
          d="M5 3.5h7l3 3V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 3.5V7h3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M7 10.2h5.5M7 13h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "documents") {
    return (
      <svg viewBox="0 0 20 20" className="tc-qa-icon" aria-hidden="true">
        <rect
          x="5"
          y="4"
          width="8"
          height="11"
          rx="1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 7h2.5M8 10h2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M13 7.2h1.6A1.4 1.4 0 0 1 16 8.6v7A1.4 1.4 0 0 1 14.6 17H8.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "report") {
    return (
      <svg viewBox="0 0 20 20" className="tc-qa-icon" aria-hidden="true">
        <rect
          x="4"
          y="3.5"
          width="11"
          height="13"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M7 12l1.8-2.2 1.7 1.6 2.5-3.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="tc-qa-icon" aria-hidden="true">
      <path
        d="M16 4L7.8 12.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 4l-4.9 12-2.7-4.3L4 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlyphIcon({ name }) {
  const value = String(name || "").toLowerCase();

  if (value.includes("encrypt") || value.includes("privacy")) {
    return (
      <svg viewBox="0 0 24 24" className="tc-glyph-svg" aria-hidden="true">
        <rect
          x="6"
          y="11"
          width="12"
          height="9"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9 11V8.7A3 3 0 0 1 12 5.8a3 3 0 0 1 3 2.9V11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (
    value.includes("infra") ||
    value.includes("cloud") ||
    value.includes("host")
  ) {
    return (
      <svg viewBox="0 0 24 24" className="tc-glyph-svg" aria-hidden="true">
        <path
          d="M8.2 18.4H17a3.4 3.4 0 0 0 .6-6.7 4.7 4.7 0 0 0-9-1.6 3.3 3.3 0 0 0-.4 6.6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (
    value.includes("access") ||
    value.includes("sso") ||
    value.includes("auth")
  ) {
    return (
      <svg viewBox="0 0 24 24" className="tc-glyph-svg" aria-hidden="true">
        <circle
          cx="9"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 12h7M17 9l2 3-2 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value.includes("incident") || value.includes("security")) {
    return (
      <svg viewBox="0 0 24 24" className="tc-glyph-svg" aria-hidden="true">
        <path
          d="M12 4l6 2.4v5.2c0 3.6-2.2 6.6-6 8.6-3.8-2-6-5-6-8.6V6.4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value.includes("fund") || value.includes("report")) {
    return (
      <svg viewBox="0 0 24 24" className="tc-glyph-svg" aria-hidden="true">
        <path
          d="M6 6h9l3 3v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M15 6v4h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="tc-glyph-svg" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function SearchBox({ value, onChange, resultsCount }) {
  return (
    <div className="tc-search">
      <span className="tc-search-icon" aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        className="tc-search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search articles"
        aria-label="Search articles"
      />
      <span className="tc-search-shortcut" aria-hidden="true">
        {value ? resultsCount : "⌘F"}
      </span>
    </div>
  );
}

function InfoBadge({ children, tone = "neutral" }) {
  return <span className={`tc-badge tc-badge-${tone}`}>{children}</span>;
}

function PageIntro({ title, description }) {
  return (
    <section className="tc-page-intro">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  );
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
              <span className="tc-faq-question-text">{faq.question}</span>
              <span className="tc-faq-chevron" aria-hidden="true">
                <svg
                  viewBox="0 0 20 20"
                  className="tc-inline-icon tc-inline-icon-sm"
                >
                  <path
                    d="M5.5 7.5L10 12l4.5-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
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

function ProfileGrid({ fields = {} }) {
  const entries = Object.entries(fields);
  if (!entries.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">Company Profile</h2>
      <div className="tc-grid tc-grid-profile">
        {entries.map(([label, field]) => (
          <div className="tc-card tc-profile-card" key={label}>
            <div className="tc-card-label">{label.replaceAll("_", " ")}</div>
            <div className="tc-card-value">{field?.value || "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComplianceGrid({ badges = [] }) {
  const visibleBadges = badges.filter(isComplianceActiveOrInProgress);
  if (!visibleBadges.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">Compliance Status</h2>
      <div className="tc-badge-grid">
        {visibleBadges.map((badge, index) => {
          const logoUrl = getComplianceLogo(badge);

          return (
            <div className="tc-badge-card" key={`${badge.name}-${index}`}>
              <div className="tc-badge-logo-wrap">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={badge.name}
                    className="tc-badge-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
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

              {badge.info_text || badge.description ? (
                <div className="tc-badge-tooltip">
                  <div className="tc-badge-tooltip-title">{badge.name}</div>
                  <div className="tc-badge-tooltip-text">
                    {badge.info_text || badge.description}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HeroSection({ section, company }) {
  const logoUrl = section.logo_url || company.logo_url;
  const description =
    section.content ||
    company.description_short ||
    company.description_long ||
    "Company trust center profile.";

  return (
    <section className="tc-hero">
      <div className="tc-hero-logo-wrap">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company.display_name}
            className="tc-hero-logo-image"
          />
        ) : (
          <div className="tc-company-icon">
            {getInitials(company.display_name)}
          </div>
        )}
      </div>

      <div className="tc-hero-copy">
        <h1>{company.display_name}</h1>
        <p>{description}</p>
      </div>

      <div className="tc-scan-pill">
        <span className="tc-scan-dot" />
        <span>Last scanned {formatScanDate(company.scan_date)}</span>
        <span className="tc-scan-info" aria-hidden="true">
          <InfoIcon />
        </span>
      </div>
    </section>
  );
}

function PostureCardsSection({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">Security Posture</h2>
      <div className="tc-grid tc-grid-2">
        {cards.map((card, index) => (
          <div className="tc-icon-card" key={`${card.card}-${index}`}>
            <div
              className={`tc-glyph-box tc-glyph-box-${getBadgeTone(card.confidence)}`}
            >
              <GlyphIcon name={card.card} />
            </div>

            <div className="tc-icon-card-copy">
              <div className="tc-card-row">
                <div className="tc-card-value">{card.card}</div>
                {card.confidence ? (
                  <InfoBadge tone={getBadgeTone(card.confidence)}>
                    {card.confidence}
                  </InfoBadge>
                ) : null}
              </div>

              <div className="tc-card-text">{card.content}</div>
              {card.source ? (
                <div className="tc-card-subtle">{card.source}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PeopleSection({ heading = "Founders", leaders = [] }) {
  if (!leaders.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">{heading}</h2>
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

            <div className="tc-person-copy">
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

function ItemCardsSection({ heading, items = [], sectionType }) {
  if (!items.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">{heading || "Details"}</h2>
      <div className="tc-grid tc-grid-2">
        {items.map((item, index) => {
          const action = resolveAction(item, sectionType);
          const status = cardStatusText(item);
          const secondary = cardSecondaryText(item);
          const source = cardSourceText(item);

          return (
            <div
              className="tc-card tc-list-card"
              key={`${cardPrimaryText(item)}-${index}`}
            >
              <div className="tc-card-row">
                <div className="tc-card-value">{cardPrimaryText(item)}</div>
                {status ? (
                  <InfoBadge tone={getBadgeTone(status)}>{status}</InfoBadge>
                ) : null}
              </div>

              {secondary ? (
                <div className="tc-card-text">{secondary}</div>
              ) : null}
              {source ? <div className="tc-card-subtle">{source}</div> : null}

              {action ? (
                <div className="tc-card-action">
                  <SmartAnchor
                    href={action.href}
                    external={action.external}
                    className="tc-inline-btn"
                  >
                    <span>{action.label}</span>
                    <ArrowRightIcon />
                  </SmartAnchor>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TableSection({ heading = "Subprocessors", rows = [] }) {
  if (!rows.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">{heading}</h2>

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
            {rows.map((item, index) => (
              <tr key={`${item.service}-${index}`}>
                <td>{item.service}</td>
                <td>{item.purpose}</td>
                <td>{item.location || "—"}</td>
                <td>
                  {item.status ? (
                    <InfoBadge tone={getBadgeTone(item.status)}>
                      {item.status}
                    </InfoBadge>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {item.confidence ? (
                    <InfoBadge tone={getBadgeTone(item.confidence)}>
                      {item.confidence}
                    </InfoBadge>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimelineSection({
  heading = "Security Incident History",
  items = [],
}) {
  if (!items.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">{heading}</h2>
      <div className="tc-stack">
        {items.map((item, index) => (
          <div className="tc-card" key={`${item.title}-${index}`}>
            <div className="tc-card-row">
              <div className="tc-card-value">{item.title}</div>
              {item.date ? <InfoBadge>{item.date}</InfoBadge> : null}
            </div>
            <div className="tc-card-text">{item.summary || item.content}</div>
            {item.source || item.url ? (
              <div className="tc-card-subtle">{item.source || item.url}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function TechCategoriesSection({ categories = [] }) {
  if (!categories.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">Integrations & Tech Stack</h2>
      <div className="tc-grid tc-grid-2">
        {categories.map((category, index) => (
          <div className="tc-card" key={`${category.category}-${index}`}>
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

function AvailableMaterialsSection({ heading, materials = [] }) {
  if (!materials.length) return null;

  return (
    <section className="tc-section">
      <h2 className="tc-section-title">{heading || "Available Materials"}</h2>
      <div className="tc-grid tc-grid-2">
        {materials.map((item, index) => (
          <SmartAnchor
            key={`${item.name}-${index}`}
            href={item.url}
            external
            className="tc-card tc-material-card"
          >
            <div>
              <div className="tc-card-value">{item.name}</div>
              <div className="tc-card-subtle">{item.url}</div>
            </div>
            <span className="tc-material-icon" aria-hidden="true">
              <ArrowRightIcon />
            </span>
          </SmartAnchor>
        ))}
      </div>
    </section>
  );
}

function CtaSection({ heading = "Security Questionnaire", content }) {
  return (
    <section className="tc-section">
      <div className="tc-cta-card">
        <div className="tc-cta-icon-wrap">
          <div className="tc-cta-icon">
            <QuickActionIcon kind="questionnaire" />
          </div>
        </div>

        <div className="tc-cta-copy">
          <div className="tc-cta-topline">
            <h3>{heading}</h3>
            <InfoBadge tone="green">Powered by DSALTA®</InfoBadge>
          </div>
          <p>{content}</p>
        </div>

        <SmartAnchor href={DSALTA_SIGNUP_URL} className="tc-primary-btn">
          <span>Send Questionnaire</span>
          <ArrowRightIcon />
        </SmartAnchor>
      </div>
    </section>
  );
}

function NoteSection({ content }) {
  return (
    <section className="tc-section">
      <div className="tc-note">
        <span className="tc-note-icon" aria-hidden="true">
          <InfoIcon />
        </span>
        <div className="tc-note-content">{content}</div>
      </div>
    </section>
  );
}

function SectionRenderer({ section, company }) {
  if (!section || !section.type) return null;

  switch (section.type) {
    case "hero":
      return <HeroSection section={section} company={company} />;

    case "company_profile_grid":
      return <ProfileGrid fields={section.fields || {}} />;

    case "badge_row":
      return <ComplianceGrid badges={section.badges || []} />;

    case "posture_card_group":
      return <PostureCardsSection cards={section.cards || []} />;

    case "founder_cards":
      return (
        <PeopleSection heading="Founders" leaders={section.leaders || []} />
      );

    case "confirmed_items":
    case "confirmed_capabilities":
    case "not_confirmed_items":
    case "not_confirmed_capabilities":
    case "published_policies":
    case "not_found_policies":
      return (
        <ItemCardsSection
          heading={section.heading}
          items={section.items || []}
          sectionType={section.type}
        />
      );

    case "subprocessor_table":
      return (
        <TableSection
          heading={section.heading || "Subprocessors"}
          rows={section.subprocessors || []}
        />
      );

    case "timeline":
      return (
        <TimelineSection
          heading={section.heading || "Security Incident History"}
          items={section.items || []}
        />
      );

    case "website_security_cards":
    case "assessment_cards":
      return (
        <ItemCardsSection
          heading={section.heading || cleanHeadingFallback(section.type)}
          items={(section.cards || []).map((card) => ({
            title: card.header || card.category,
            detail: card.detail || card.finding,
            confidence: card.status || card.severity,
            source: card.source || card.meta,
          }))}
          sectionType={section.type}
        />
      );

    case "tech_categories":
      return <TechCategoriesSection categories={section.categories || []} />;

    case "available_materials":
      return (
        <AvailableMaterialsSection
          heading={section.heading}
          materials={section.materials || []}
        />
      );

    case "questionnaire_cta":
      return (
        <CtaSection
          heading={section.heading || "Security Questionnaire"}
          content={section.content}
        />
      );

    case "faq_list":
      return <FaqAccordion faqs={section.faqs || []} />;

    case "note":
    case "callout":
      return <NoteSection content={section.content} />;

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

function cleanHeadingFallback(type) {
  if (type === "website_security_cards") return "Website Scan";
  if (type === "assessment_cards") return "Assessment Findings";
  return "Details";
}

export default function TrustCenterPage({ company, currentPage, allPages }) {
  const [searchQuery, setSearchQuery] = useState("");

  const groupEntries = orderedGroupEntries(allPages);
  const rawSections = toArray(currentPage.sections_json);
  const faqs = toArray(currentPage.faqs_json);
  const { prevPage, nextPage } = findAdjacentPages(
    allPages,
    currentPage.route_slug,
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!query) return rawSections;
    return rawSections.filter((section) =>
      sectionText(section).includes(query),
    );
  }, [rawSections, query]);

  const displaySections = useMemo(
    () => groupSections(filteredSections),
    [filteredSections],
  );

  const filteredFaqs = useMemo(() => {
    if (!query) return faqs;
    return faqs.filter((faq) => faqMatches(faq, query));
  }, [faqs, query]);

  const resultCount = displaySections.length + filteredFaqs.length;

  const prevHref = prevPage
    ? pageHref(company.slug, prevPage.route_slug)
    : null;
  const nextHref = nextPage
    ? pageHref(company.slug, nextPage.route_slug)
    : null;

  const hasHero = displaySections.some((section) => section?.type === "hero");
  const pageTitle = cleanPageTitle(company, currentPage);

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

          <a
            className="tc-topbar-btn"
            href={CLAIM_PAGE_URL}
            target="_blank"
            rel="noreferrer"
          >
            <span>Claim this page</span>
            <ArrowRightIcon />
          </a>
        </div>
      </div>

      <div className="tc-page">
        <header className="tc-header">
          <div className="tc-header-left">
            <CompanyHeaderIcon />
            <div className="tc-header-company-wrap">
              <div className="tc-header-company" title={company.display_name}>
                {company.display_name}
              </div>
              <div className="tc-header-divider" />
              <div className="tc-header-product">Trust Center</div>
            </div>
          </div>

          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            resultsCount={resultCount}
          />
        </header>

        <div className="tc-body">
          <aside className="tc-sidebar">
            <div className="tc-sidebar-scroll">
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
                    <span
                      className="tc-sidebar-summary-icon"
                      aria-hidden="true"
                    >
                      <span className="tc-icon-plus">+</span>
                      <span className="tc-icon-minus">−</span>
                    </span>
                  </summary>

                  <div className="tc-sidebar-links">
                    {pages.map((page) => {
                      const active = page.route_slug === currentPage.route_slug;
                      const isVendor = groupName === "VENDOR INTELLIGENCE";

                      return (
                        <a
                          key={page.id}
                          href={pageHref(company.slug, page.route_slug)}
                          className={`tc-sidebar-link ${active ? "is-active" : ""}`}
                        >
                          <span>
                            {page.nav_label || cleanPageTitle(company, page)}
                          </span>
                          {isVendor ? (
                            <span
                              className="tc-sidebar-link-arrow"
                              aria-hidden="true"
                            >
                              <ArrowRightIcon />
                            </span>
                          ) : null}
                        </a>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>

            <div className="tc-sidebar-bottom">
              <div className="tc-quick-actions">
                <div className="tc-sidebar-title">Quick Actions</div>

                <a
                  className="tc-qa-link"
                  href={DSALTA_SIGNUP_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <QuickActionIcon kind="questionnaire" />
                  <span>Send Questionnaire</span>
                </a>

                <a
                  className="tc-qa-link"
                  href={DSALTA_SIGNUP_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <QuickActionIcon kind="documents" />
                  <span>Request Documents</span>
                </a>

                <a
                  className="tc-qa-link"
                  href={DSALTA_SIGNUP_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <QuickActionIcon kind="report" />
                  <span>Get Risk Report</span>
                </a>

                <a
                  className="tc-qa-link"
                  href={DSALTA_SIGNUP_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <QuickActionIcon kind="contact" />
                  <span>Contact Security</span>
                </a>
              </div>
            </div>
          </aside>

          <main className="tc-main">
            <div className="tc-content-wrap">
              <div className="tc-breadcrumbs">
                <span>{breadcrumbGroupLabel(currentPage.nav_group)}</span>
                <span className="tc-breadcrumb-sep" aria-hidden="true">
                  <ChevronRightIcon />
                </span>
                <span className="tc-breadcrumb-current">{pageTitle}</span>
              </div>

              {!hasHero ? (
                <PageIntro
                  title={pageTitle}
                  description={currentPage.description}
                />
              ) : null}

              {displaySections.map((section, index) => (
                <SectionRenderer
                  key={`${section.type}-${index}`}
                  section={section}
                  company={company}
                />
              ))}

              {!displaySections.length && !filteredFaqs.length ? (
                <section className="tc-section">
                  <div className="tc-card">
                    <div className="tc-card-value">No results found</div>
                    <div className="tc-card-text">
                      Try a different keyword for this page.
                    </div>
                  </div>
                </section>
              ) : null}

              {!query && !rawSections.length ? (
                <section className="tc-section">
                  <div className="tc-card">
                    <div className="tc-card-value">{pageTitle}</div>
                    <div className="tc-card-text">
                      {currentPage.description}
                    </div>
                  </div>
                </section>
              ) : null}

              <FaqAccordion faqs={filteredFaqs} />

              <div className="tc-nav-footer">
                {prevHref ? (
                  <a className="tc-nav-btn is-prev" href={prevHref}>
                    <span className="tc-nav-btn-icon" aria-hidden="true">
                      <ArrowLeftIcon />
                    </span>
                    <span className="tc-nav-btn-body">
                      <span className="tc-nav-btn-meta">PREVIOUS</span>
                      <span className="tc-nav-btn-title">
                        {prevPage.nav_label ||
                          cleanPageTitle(company, prevPage)}
                      </span>
                    </span>
                  </a>
                ) : (
                  <span className="tc-nav-spacer" />
                )}

                {nextHref ? (
                  <a className="tc-nav-btn is-next" href={nextHref}>
                    <span className="tc-nav-btn-body">
                      <span className="tc-nav-btn-meta">NEXT</span>
                      <span className="tc-nav-btn-title">
                        {nextPage.nav_label ||
                          cleanPageTitle(company, nextPage)}
                      </span>
                    </span>
                    <span className="tc-nav-btn-icon" aria-hidden="true">
                      <ArrowRightIcon />
                    </span>
                  </a>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </div>

      <footer className="tc-footer">
        <div className="tc-footer-inner">
          <div className="tc-footer-left">
            <DsaltaMark />
            <span>Powered by DSALTA®</span>
          </div>

          <div className="tc-footer-right">
            <a href="#">Report an issue</a>
            <a href="https://www.dsalta.com/" target="_blank" rel="noreferrer">
              Get your free trust center
            </a>
            <a href={CLAIM_PAGE_URL} target="_blank" rel="noreferrer">
              Claim this page
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
