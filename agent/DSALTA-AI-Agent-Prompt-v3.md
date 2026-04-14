# DSALTA Security Profile Generator — Production Specification v3

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
Generate public security/compliance profile pages for companies using ONLY publicly available information. Output must be accurate, defensible, and useful for procurement, security, legal, and compliance reviewers.

### 1.2 Architecture — Separation of Responsibilities

**CRITICAL**: The system has THREE distinct components. They must NOT be confused.

| Component | Responsibility | Examples |
|-----------|---------------|----------|
| **Apollo Enrichment** (structured API) | Provides verified company facts as ground truth | Company name, founded year, funding rounds, investors, employee count, tech stack, leadership names, social links |
| **Scanner** (automated tools) | Collects raw technical data from external systems | HTTP headers, DNS records (SPF/DKIM/DMARC), TLS certificates, cookie detection, JavaScript source analysis, page crawling |
| **AI Generator** (LLM) | Writes human-readable content from collected data | Descriptions, FAQ answers, assessment ratings, status callouts, cross-references |

**Hierarchy**: Apollo data > Scanner data > AI-generated content. If Apollo says founded year is 2022, the AI does NOT override it with a different year from a blog post.

**The LLM must NEVER invent scanner outputs.** If the scanner did not return HTTP header data, the LLM must not write "HSTS header present."

**The LLM must NEVER fabricate Apollo outputs.** If Apollo did not return founder names, the LLM must NOT generate names. It must write "Not publicly confirmed."

### 1.3 Data Sources

| Source | Collection Method | Component | Priority |
|--------|------------------|-----------|----------|
| Apollo company enrichment | API call | Apollo | 1 (highest) |
| Apollo people search | API call | Apollo | 1 |
| Company website (homepage, footer, nav) | Web scraper / crawler | Scanner | 2 |
| Privacy policy, terms, security page | Web scraper / crawler | Scanner | 2 |
| Trust center (security.{domain}) | Web scraper | Scanner | 2 |
| HTTP response headers | HTTP client | Scanner | 2 |
| DNS records (SPF, DKIM, DMARC, MX) | DNS resolver | Scanner | 2 |
| TLS/SSL certificate details | TLS handshake | Scanner | 2 |
| JavaScript source analysis | Page source parser | Scanner | 2 |
| Cookie detection | Browser automation | Scanner | 2 |
| News articles, blog posts | Web search | Scanner | 3 |
| Company profile synthesis | LLM | AI Generator | 4 (lowest) |
| Page content writing | LLM | AI Generator | 4 |
| FAQ generation | LLM | AI Generator | 4 |
| Assessment severity rating | LLM (from scanner data) | AI Generator | 4 |

---

## 2. DATA COLLECTION PIPELINE — WATERFALL APPROACH

The pipeline runs as a waterfall: pull from Apollo first, use what Apollo provides, then ONLY search for what Apollo didn't cover. This minimizes cost, maximizes accuracy, and ensures structured data is always preferred over AI-scraped data.

### PHASE 1: APOLLO DATA PULL (Execute FIRST — before anything else)

#### 2.1.1 Company Enrichment (1 credit)
Call Apollo `organizations_enrich` with the target domain. Extract and store ALL returned fields:

```json
{
  "company_name": "",
  "domain": "",
  "description_seed": "",
  "industry": "",
  "keywords": [],
  "founded_year": null,
  "hq_city": "",
  "hq_state": "",
  "hq_country": "",
  "hq_address": "",
  "employee_count": null,
  "annual_revenue": "",
  "total_funding": null,
  "total_funding_printed": "",
  "latest_funding_stage": "",
  "latest_funding_date": "",
  "all_funding_events": [],
  "top_investors": "",
  "technologies": [],
  "departmental_headcount": {},
  "suborganizations": [],
  "logo_url": "",
  "social_links": {
    "website_url": "",
    "linkedin_url": "",
    "twitter_url": "",
    "facebook_url": "",
    "angellist_url": "",
    "crunchbase_url": ""
  },
  "headcount_growth": {
    "six_month": null,
    "twelve_month": null,
    "twenty_four_month": null
  }
}
```

#### 2.1.2 Leadership Search (0 credits — free search)
Call Apollo `mixed_people_api_search` with:
- `q_organization_domains_list`: [target domain]
- `person_seniorities`: ["c_suite", "founder", "owner", "vp", "director"]
- `per_page`: 10

Store results:
```json
{
  "apollo_leaders": [
    {
      "first_name": "Han",
      "last_name_obfuscated": "Wa***g",
      "title": "Co-Founder",
      "source": "apollo_search"
    }
  ]
}
```

#### 2.1.3 After Apollo — Check What You Have vs What's Missing

After Apollo returns, evaluate every field. Build a `_needs_search` checklist:

| Category | Apollo provides? | If YES | If NO — search for it |
|----------|-----------------|--------|----------------------|
| **Company name** | ✅ Usually yes | Use Apollo value. Done. | Search company website `<title>` tag |
| **Founded year** | ✅ Usually yes | Use Apollo value. Done. Do NOT override. | Search: `"{company}" founded year site:crunchbase.com` |
| **HQ location** | ✅ Usually yes | Use Apollo value. Done. | Search: company /about page or LinkedIn |
| **Employee count** | ✅ Usually yes | Use Apollo value. Done. | Search: LinkedIn company page, Crunchbase |
| **Revenue estimate** | ✅ Usually yes | Use Apollo value. Done. | Skip — not critical for security profile |
| **Total funding** | ✅ If funded | Use Apollo `total_funding` + `all_funding_events`. Done. | Search: `"{company}" funding raised site:crunchbase.com` |
| **All investors** | ✅ If funded | Use ALL investors from Apollo `all_funding_events`. Done. | Search: `"{company}" investors funding round` |
| **Tech stack** | ✅ Usually yes | Use Apollo `technologies[]`. Supplement with scanner. | Scanner detects from HTTP headers + JS source |
| **Social links** | ✅ LinkedIn, Twitter, Facebook | Use Apollo URLs directly. | Verify additional platforms with HEAD requests (see 2.1.4) |
| **Company description** | ✅ Usually yes | Use Apollo `description_seed` as base. Enhance with website. | Scrape homepage meta description |
| **Acquisitions** | ✅ Via `suborganizations` | Use Apollo data. Done. | Search: `"{company}" acquired acquisition` |
| **Headcount growth** | ✅ Usually yes | Use Apollo 6/12/24 month growth rates. Done. | Skip — Apollo is the only reliable source |
| **Department breakdown** | ✅ Usually yes | Use Apollo `departmental_headcount`. Done. | Skip — Apollo is the only reliable source |
| **Leadership names** | ⚠️ Partial (obfuscated last names) | Use first names + titles. Then try to resolve full names from website. | Crawl /about, /team, /company page for full names |
| **Leader backgrounds** | ❌ Not from Apollo | — | Crawl company /about page. If not found, note "Not confirmed." |
| **Compliance certs** | ❌ Not from Apollo | — | MUST search: website /security page, trust center, web search |
| **Security posture** | ❌ Not from Apollo | — | MUST scan: website, trust center, security page |
| **Policies & legal** | ❌ Not from Apollo | — | MUST crawl: /privacy, /terms, /dpa, /sla, /security |
| **Subprocessors** | ❌ Not from Apollo | — | MUST detect: JS source analysis, DNS, privacy policy mentions |
| **Data handling** | ❌ Not from Apollo | — | MUST parse: privacy policy, security page |
| **Incident history** | ❌ Not from Apollo | — | MUST search: 7 query variations (see 2.2.4) |
| **Incident response** | ❌ Not from Apollo | — | MUST check: status page, disclosure program |
| **Website security** | ❌ Not from Apollo | — | MUST scan: HTTP headers, TLS, DNS, cookies |
| **Bug bounty** | ❌ Not from Apollo | — | MUST check: 5 URL patterns (see 2.2.2) |
| **Customer logos** | ❌ Not from Apollo | — | Scrape homepage for logo sections |

**GROUND TRUTH RULE**: If Apollo returned a value for a field, that value is FINAL. The scanner and AI Generator must NEVER override:
- `founded_year`
- `employee_count`
- `total_funding` / `all_funding_events` / `top_investors`
- `social_links` (LinkedIn, Twitter, Facebook from Apollo)
- `technologies` (Apollo tech stack — scanner can ADD more but not remove. **IMPORTANT: Copy ALL technology names from the Apollo tool result into `apollo_data.technologies[]` — do not summarize or truncate the list. If Apollo returned 30+ technologies, all 30+ must appear in the output.**)
- `headcount_growth`
- `departmental_headcount`

#### 2.1.4 Social Links — Apollo + Verification
Apollo returns: `linkedin_url`, `twitter_url`, `facebook_url`, `angellist_url`

**RULE**: Use Apollo-provided URLs directly — they come from Apollo's database and do not need re-verification.

For platforms Apollo does NOT cover (GitHub, YouTube, Instagram, Crunchbase, Blog, Status Page, Changelog), run TWO checks:
1. **Existence check**: Send a HEAD request. If status ≠ 200 → set to `null` and stop.
2. **Ownership check**: Call `gemini_search` with a plain-English question asking whether the page is an active, company-owned account. If Gemini confirms the page is empty, inactive, or unrelated → set to `null`.

| Platform | URL Pattern | Verify? |
|----------|-------------|---------|
| LinkedIn | From Apollo `linkedin_url` | No — use directly |
| Twitter/X | From Apollo `twitter_url` | No — use directly |
| Facebook | From Apollo `facebook_url` | No — use directly |
| AngelList | From Apollo `angellist_url` | No — use directly |
| GitHub | `github.com/{company_name}` | YES — HEAD + `gemini_search` |
| YouTube | `youtube.com/@{company_name}` | YES — HEAD + `gemini_search` |
| Instagram | `instagram.com/{company_name}` | YES — HEAD + `gemini_search` |
| Crunchbase | `crunchbase.com/organization/{company_name}` | YES — HEAD + `gemini_search` |
| Blog | `{domain}/blog` | YES — HEAD only |
| Status Page | `status.{domain}` | YES — HEAD only |
| Changelog | Use `gemini_search` to find the correct URL (e.g. `"{company} changelog site:{domain}"`) — changelog pages are often at non-standard paths like `/docs/changelog`. Then verify with HEAD. | YES — `gemini_search` + HEAD |

**Example `gemini_search` queries for social ownership verification:**
- "Is youtube.com/@mintlify an active Mintlify YouTube channel with videos, or is it empty?"
- "Is github.com/mintlifyio an active Mintlify GitHub organization with public repositories?"
- "Is instagram.com/mintlify an active Instagram account for the Mintlify company?"

Store all verified URLs in `social_links`. Set `null` for any that fail the existence or ownership check.

**logo_url rule**: Use the `logo_url` value provided by Apollo. Do NOT use Clearbit (`logo.clearbit.com`) or any other logo CDN as a substitute. If Apollo did not return a logo URL, set `logo_url` to `null`.

---

### PHASE 2: SCANNER — Search for what Apollo doesn't have (Automated — NOT LLM)

The scanner ONLY runs for categories marked "NO" in the Apollo checklist above. It fills the gaps.

#### 2.2.1 Website Crawl (ALWAYS runs — Apollo doesn't cover website content)
- Fetch homepage at `https://{domain}`
- Extract: title, meta description, og:image, theme-color, favicon
- Parse footer links → identify: Privacy, Terms, Security, Status, Legal pages
- Parse navigation → identify: Enterprise, Pricing, Customers, About, Careers
- Extract customer logos from homepage sections
- Extract compliance badges from footer/trust sections
- Identify JavaScript sources:
  - Analytics: PostHog, GA4, Mixpanel, Amplitude, Segment, Heap, Hotjar
  - Payments: Stripe.js, PayPal SDK, Paddle.js
  - Chat: Intercom, Drift, Crisp, Zendesk
  - Auth: Auth0, Clerk, Stytch
- Detect framework: `_next/` = Next.js, `__nuxt` = Nuxt, React/Vue/Angular markers
- Detect CDN: jsdelivr, cloudfront, cloudflare, fastly domains

#### 2.2.2 Legal & Security Page Crawl (ALWAYS runs — Apollo doesn't cover policies/compliance)
Attempt to fetch each URL. Record: found (true/false), HTTP status, page content.

```
{domain}/security
{domain}/trust
{domain}/legal/privacy OR {domain}/privacy OR {domain}/privacy-policy
{domain}/legal/terms OR {domain}/terms
{domain}/security/responsible-disclosure
{domain}/bug-bounty
{domain}/.well-known/security.txt
security.{domain}
status.{domain}
{domain}/legal/dpa
{domain}/legal/sla
{domain}/legal/cookies
{domain}/legal/third-party-provider-terms
{domain}/enterprise
{domain}/about OR {domain}/team OR {domain}/company
```

**URL Validation Rule**: HEAD request every URL. 200 = include. 301/302 = follow redirect, use final URL. 404/5xx = exclude and log in `_errors`.

**Leadership name resolution**: If Apollo returned leaders with obfuscated last names (containing `*`), you MUST attempt to resolve the full name by:
1. Fetching `{domain}/about`, `{domain}/team`, `{domain}/company` — look for the person's full name in the page content
2. Call `gemini_search` with a targeted query using the Apollo-provided first name and company name, e.g.: `"Han Wang Mintlify co-founder"` or `"Han Mintlify co-founder full name"`. Gemini's grounded search will return the actual full name from public sources (LinkedIn, Crunchbase, news articles, etc.).
3. Website-sourced or Gemini-resolved full names override Apollo obfuscated names
4. If resolution fails after all steps, use `{first_name}` only + title (e.g., "Han — Co-Founder"). NEVER fabricate or guess a last name.

#### 2.2.3 Technical Analysis (Scanner ONLY — ALWAYS runs)
- HTTP response headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, X-Powered-By, Server
- TLS: version support, certificate validity, expiry date
- DNS: SPF record, DKIM record, DMARC record and policy, MX records
- Cookies: count before consent, consent mechanism detection
- HTTP/2 support

#### 2.2.4 Web Search — ONLY for categories Apollo doesn't cover

**Compliance & Security (Apollo doesn't have this — ALWAYS search):**
```
1. "{company_name}" SOC 2 compliance
2. "{company_name}" ISO 27001 certification
3. "{company_name}" GDPR compliance DPA
4. "{company_name}" HIPAA compliance BAA
5. "{company_name}" SSO SAML SCIM
6. "{company_name}" penetration testing
```

**Compliance fallback — homepage and product pages:**
If the security/trust page does not confirm a certification, ALSO scan the homepage, enterprise page (`{domain}/enterprise`, `{domain}/security`), and pricing page for any mention of compliance certifications. A statement like "SOC 2 in progress" or "ISO 27001 certification underway" on any company-owned page counts as `STATED` and must NOT be reported as `NOT FOUND`. A company explicitly stating a cert is in progress on their own website overrides `NOT FOUND`.

**Incidents (Apollo doesn't have this — ALWAYS search ALL of these):**
```
7. "{company_name}" security incident
8. "{company_name}" data breach
9. "{company_name}" security event
10. "{company_name}" CVE
11. "{company_name}" vulnerability disclosure
```
Also check: `status.{domain}` incident history, SecurityWeek, BleepingComputer, The Record.

If incidents exist, they MUST appear in the output. Saying "no incidents found" when incidents exist is a CRITICAL error.

**Company data — ONLY if Apollo didn't return it:**
```
12. "{company_name}" funding investors founded    → SKIP if Apollo returned funding data
13. "{company_name}" site:crunchbase.com          → SKIP if Apollo returned funding data
14. "{company_name}" site:linkedin.com/company    → SKIP if Apollo returned LinkedIn URL
15. "{company_name}" acquisition acquired          → SKIP if Apollo returned suborganizations
16. "{company_name}" customers case studies        → ALWAYS search (Apollo doesn't cover this)
```

#### 2.2.5 Waterfall Summary

```
FOR EACH data field:
  1. Check: Does Apollo have this?
     → YES: Use Apollo value. Mark as DETECTED. DONE. Move to next field.
     → NO: Continue to step 2.
  
  2. Check: Did the website crawl find this?
     → YES: Use website value. Mark as VERIFIED (if company's own site) or DETECTED. DONE.
     → NO: Continue to step 3.
  
  3. Check: Did the web search find this?
     → YES: Use web search value. Mark confidence appropriately. DONE.
     → NO: Continue to step 4.
  
  4. Mark as NOT FOUND. List which sources were checked.
     → NEVER let the AI Generator fill in a guess.
```

### 2.3 Scanner Output Format

```json
{
  "domain": "example.com",
  "scan_date": "2026-04-01T12:00:00Z",
  "scanner_version": "2.0",
  
  "apollo_data": {
    "company_name": "...",
    "founded_year": 2022,
    "employee_count": 67,
    "total_funding": 21300000,
    "total_funding_printed": "21.3M",
    "all_funding_events": [],
    "top_investors": "...",
    "technologies": [],
    "departmental_headcount": {},
    "headcount_growth": {},
    "description_seed": "...",
    "logo_url": "...",
    "social_links": {
      "website_url": "...",
      "linkedin_url": "...",
      "twitter_url": "...",
      "facebook_url": "...",
      "github_url": "...",
      "youtube_url": "...",
      "instagram_url": "...",
      "crunchbase_url": "...",
      "blog_url": "...",
      "status_page_url": "...",
      "angellist_url": "..."
    },
    "apollo_leaders": [
      { "first_name": "...", "last_name_obfuscated": "...", "title": "...", "source": "apollo_search" }
    ]
  },
  
  "website": {
    "title": "...",
    "meta_description": "...",
    "og_image": "url",
    "theme_color": "#hex",
    "favicon_url": "url",
    "footer_links": [ { "text": "...", "url": "...", "category": "legal|security|status|other" } ],
    "customer_logos": [ "Company A", "Company B" ],
    "compliance_badges": [ "SOC 2", "ISO 27001" ],
    "detected_scripts": [ { "service": "Stripe", "category": "payments", "evidence": "stripe.js loaded" } ],
    "detected_framework": "nextjs|nuxt|react|vue|angular|unknown",
    "detected_cdn": ["cloudfront", "jsdelivr"]
  },
  
  "pages_crawled": [
    { "url": "...", "found": true, "status": 200, "content_excerpt": "..." }
  ],
  
  "technical": {
    "headers": { "strict_transport_security": "present|absent", "...": "..." },
    "tls": { "versions": ["1.2", "1.3"], "cert_valid": true, "cert_expiry": "..." },
    "dns": { "spf": "present|absent", "dkim": "present|absent", "dmarc": { "present": true, "policy": "none|quarantine|reject" } },
    "cookies": { "count_before_consent": 4, "consent_mechanism": "none|onetrust|cookiebot|custom" },
    "http2": true
  },
  
  "enrichment": {
    "incidents": [ { "date": "...", "title": "...", "summary": "...", "source_url": "...", "severity": "...", "status": "resolved" } ],
    "acquisitions": [ { "company": "...", "date": "...", "source_url": "..." } ],
    "customers_mentioned": [ "..." ],
    "leadership_from_website": [ { "name": "...", "title": "...", "background": "...", "source": "company_website" } ]
  },
  
  "social_links_verified": {
    "github_url": "https://github.com/... | null",
    "youtube_url": "... | null",
    "instagram_url": "... | null",
    "blog_url": "... | null",
    "status_page_url": "... | null",
    "changelog_url": "... | null"
  },
  
  "_url_errors": [ { "url": "...", "status": 404, "note": "..." } ],
  
  "data_richness_score": 8
}
```

---

## 3. CONFIDENCE CLASSIFICATION

Every data point MUST carry exactly one confidence label.

| Label | Definition | Evidence Required | Example |
|-------|-----------|-------------------|---------|
| **VERIFIED** | Confirmed from company's own published, currently-accessible source | Direct URL to company page where statement is found | SOC 2 badge on trust center at security.company.com |
| **STATED** | Company claims it in marketing or product materials, not independently validated | URL to company page, but claim is not independently verifiable | "ISO 27001 in progress" on enterprise page |
| **DETECTED** | Found through technical scanning, Apollo data, or third-party databases | Scanner output log, Apollo API response, third-party database entry | Stripe.js found in page source; Vercel from HTTP headers; 67 employees from Apollo |
| **NOT FOUND** | Actively searched in expected locations and not found | List of locations searched | No DPA found after checking /legal/dpa, /dpa, /legal/, privacy policy |

### 3.1 High-Risk Evidence Thresholds

| Claim Type | Minimum Confidence | Additional Requirement |
|-----------|-------------------|----------------------|
| Compliance certification — achieved (SOC 2, ISO, HIPAA) | VERIFIED only | Must link to trust center badge, audit report, or official security page |
| Compliance certification — in progress | STATED | Company explicitly states certification is in progress. Use confidence `"STATED"` and include "in progress" in the answer text. |
| Security incident / breach | VERIFIED only | Must cite company's own post-mortem, blog, or status page entry |
| Data handling promises ("never stored," "never trained") | VERIFIED only | Must quote or closely paraphrase company's own security page |
| Founded year, funding, investors | DETECTED | Must come from Apollo enrichment or Crunchbase |
| Leadership names | DETECTED or VERIFIED (website) | Must come from Apollo search or company /about page. NEVER from LLM |
| Employee count | DETECTED | Must come from Apollo enrichment |
| Subprocessor identification | DETECTED or higher | Must cite detection method (JS source, privacy policy, DNS, etc.) |

**Claims that CANNOT be made at any confidence level:**
- "Company is vulnerable to X" (unless from scanner finding with evidence)
- "Company probably has / likely uses X"
- "Based on their industry, they should have X"
- Any inference, speculation, or assumption presented as fact
- Fabricated founder/CEO/CTO names not from Apollo or company website

### 3.2 Forbidden Language

The LLM must NEVER use these phrases:
- "likely," "probably," "may use," "appears to," "seems to"
- "indicate they are prepared for" (especially for GDPR)
- "based on industry norms," "typically companies like this"
- "we assume," "it is expected that," "it is reasonable to conclude"
- "this suggests," "this implies," "this indicates" (when drawing conclusions beyond the data)

**Acceptable alternatives:**
- "Not found in public sources."
- "No public evidence of [X] was identified."
- "[X] was not present in the pages we reviewed: [list of URLs checked]."
- "This information was not included in {Company}'s privacy policy or security page."

---

## 4. PUBLISHING CONTROLS

### 4.1 Data Richness Score

| Signal | Points |
|--------|--------|
| Apollo enrichment returned data (funding, employees, description) | +1 |
| Privacy policy found and crawlable | +1 |
| Terms of service found | +0.5 |
| Dedicated security page exists | +2 |
| Trust center exists (Drata, Vanta, SafeBase, etc.) | +2 |
| At least one compliance certification confirmed (VERIFIED) | +2 |
| Responsible disclosure / bug bounty program found | +1 |
| Status page exists | +0.5 |
| Published incident post-mortem found | +0.5 |
| 3+ subprocessors detected | +0.5 |
| Security headers scanned (scanner output available) | +0.5 |
| Social media links verified (3+ platforms) | +0.5 |

### 4.2 Publishing Decision Gate

| Score | Decision | Page Set |
|-------|----------|----------|
| **8-10** | **Full Profile** — publish automatically | All applicable pages (up to 14) |
| **5-7** | **Standard Profile** — publish automatically | 8-12 pages (skip empty sections) |
| **3-4** | **Lite Profile** — publish with review flag | 5-7 pages (core pages only) |
| **1-2** | **Minimal Profile** — publish with prominent claim CTA | 3-4 pages (overview, compliance, FAQ, requests) |
| **0** | **Do Not Publish** — hold for manual review | None |

### 4.3 Dynamic Page Inclusion

| Page | Always Include | Include If |
|------|---------------|------------|
| Company Overview | ✅ Yes | — |
| Security Overview | ✅ Yes | — |
| Compliance Status | ✅ Yes | — |
| FAQ | ✅ Yes | — |
| Requests & Documents | ✅ Yes | — |
| Policies & Legal | Score ≥ 3 | At least 1 policy found |
| Subprocessors | Score ≥ 4 | At least 3 subprocessors detected |
| Data Handling | Score ≥ 3 | Privacy policy found |
| Incident Response | Score ≥ 5 | Status page or disclosure program found |
| Incident History | Score ≥ 5 | At least 1 public incident found |
| Website Scan | Score ≥ 3 | Scanner data available |
| Tech Stack | Score ≥ 4 | At least 3 technologies from Apollo or scanner |
| Leadership | Score ≥ 5 | Founder names from Apollo or company website |
| Assessment Findings | Score ≥ 5 | Scanner data for at least 4 categories |

---

## 5. COMPANY STATE MODES

### 5.1 Unclaimed Page (default)
**Banner**: "🔒 Generated by DSALTA · Get your free security page → [Claim This Page]"
**Tone**: Neutral, factual, careful. Every claim cites sources.
**Disclaimer**: "This profile was generated from publicly available information and has not been reviewed or verified by {Company}. Information may be incomplete or outdated."

### 5.2 Claimed Page
**Banner**: "🔒 Claimed by {Company} · Verification in progress"
**Disclaimer**: "This page has been claimed by {Company} but information has not yet been independently verified."

### 5.3 Verified Page
**Banner**: "✅ Verified by {Company} · Last updated {date}"
**Tone**: Confident, authoritative.

---

## 6. AI GENERATOR — CONTENT RULES

### 6.1 General Writing Rules

1. **Write in third person, present tense**: "{Company} maintains a SOC 2 certification."
2. **Be specific, not generic**: Reference actual URLs, actual services, actual dates.
3. **Cite sources inline**: Every factual claim followed by source in small text.
4. **Never speculate**: If scanner data doesn't include a field, omit or state "not analyzed."
5. **Vary language across companies**: No two companies should have the same sentence.
6. **Keep tone neutral and professional**: These pages serve procurement and security reviewers.
7. **Use Apollo data for all company facts**: Founded year, funding, investors, employees always from Apollo.
8. **Include social links on Overview page**: Show all verified social platforms with icons.
9. **Never mention HTTP status codes in content**: Do not write "returned HTTP 404", "returned 200", "the URL returned a 404 error", or any HTTP status code in any `content` field. Simply state what was or was not found in plain language (e.g., "No DPA was found in Mintlify's public documentation." not "mintlify.com/legal/dpa returned HTTP 404.").

### 6.2 "Not Found" Language
NEVER use a fixed phrase. Generate contextual language that names the specific company, references what was searched, and explains what the missing item means. Each "not found" must be UNIQUE per company.

### 6.3 Page Differentiation Rules

Each page serves a DISTINCT user intent:

| Page | User Intent | Must NOT overlap with |
|------|-------------|----------------------|
| Overview | "Quick summary — who is this company?" | Any other page |
| Security | "What are their technical security controls?" | Compliance, Website Scan |
| Leadership | "Who runs this company? Are they credible?" | Overview |
| Compliance | "What certifications do they hold?" | Security |
| Policies | "What legal documents exist?" | Compliance |
| Subprocessors | "Who are their third-party vendors?" | Tech Stack |
| Data Handling | "How do they handle MY data?" | Security |
| Incident Response | "What happens when something goes wrong?" | Incident History |
| Incident History | "Have they had breaches?" | Incident Response |
| Website Scan | "What did a technical scan find?" | Security |
| Tech Stack | "What technologies do they use?" | Subprocessors |
| Assessment | "What's the overall risk picture?" | Individual pages |
| FAQ | "Quick answers to common buyer questions" | Deep-dive pages |
| Requests | "How do I get documents?" | All other pages |

### 6.4 FAQ Answer Format

FAQ answers must be concise and factual. Use **"Yes."** or **"No."** ONLY when the answer is clearly binary. For mixed or unclear answers, DO NOT use "Partially." — state the facts directly without any prefix.

The `confidence` label MUST be a **separate field** from `answer` — never append it to the answer string.

```json
{ "answer": "Yes. SAML-based SSO is available on Enterprise plans with Okta, Azure AD, and Google identity providers.", "confidence": "STATED" }
{ "answer": "No. No bug bounty program was found in Mintlify's public security documentation.", "confidence": "NOT FOUND" }
{ "answer": "SOC 2 Type II is confirmed; ISO 27001 and HIPAA certifications were not found in public documentation.", "confidence": "VERIFIED" }
{ "answer": "No public DPA or GDPR compliance statement was identified in Mintlify's documentation.", "confidence": "NOT FOUND" }
```

NEVER use "Partially." NEVER use "Not found." as a prefix. NEVER append the confidence label to the end of the answer string. NEVER write multi-sentence explanations describing the search process, which URLs were checked, or what the page said verbatim. Keep FAQ answers to one sentence of substance.

### 6.5 FAQ Error Prevention Rules

These rules exist because of VERIFIED errors found in production. They are MANDATORY.

#### Bug bounty / Responsible disclosure
Before answering, the scanner MUST check ALL of these:
- `{domain}/security/responsible-disclosure`
- `{domain}/bug-bounty`
- `{domain}/.well-known/security.txt`
- `{domain}/security` (look for "responsible disclosure" or "bug bounty" text)
- SecurityWeek / HackerOne / BugCrowd mentions of the company
If ANY of these exist → answer is "Yes" with details, NOT "Not found."

#### Data breaches / Security incidents
The scanner MUST search ALL of these:
- `"{company_name}" security incident`
- `"{company_name}" data breach`
- `"{company_name}" security event`
- `"{company_name}" CVE`
- `"{company_name}" vulnerability disclosure`
- `status.{domain}` incident history
- SecurityWeek, BleepingComputer, The Record mentions
If ANY incidents found → list them ALL. NEVER say "no incidents found" when incidents exist. This is the single most damaging error.

#### GDPR compliance
- "GDPR compliant" is NOT a certification — it's a continuous state
- VERIFIED = explicit GDPR compliance statement + DPA available on website
- STATED = privacy policy mentions EU/EEA rights but no explicit compliance statement
- NOT FOUND = no GDPR references at all
- NEVER use: "indicate they are prepared for GDPR" or "suggest GDPR readiness"
- NEVER label GDPR as VERIFIED just because a privacy policy exists

#### Penetration testing
- If company has SOC 2 (requires annual pen testing) → "SOC 2 compliance requires regular penetration testing"
- If responsible disclosure program exists → reference it as evidence of security testing culture
- If published incident responses exist → reference them
- Do NOT say "While not explicitly stated, SOC 2 typically requires..." — either cite evidence or say NOT FOUND

#### SSO
- Check /pricing, /enterprise, /security pages
- Check Apollo keywords for "SAML", "SSO", "SCIM", "single sign-on"
- If found → STATED or VERIFIED with source
- If not found → NOT FOUND (do not speculate)

---

## 7. PAGE-BY-PAGE GENERATION

### PAGE 1: Company Overview (ALWAYS INCLUDED)

**Content blocks**:
- H1 + description (from Apollo `description_seed` + web-scraped product details)
- Scan line (scan_date, sources used)
- Status callout (green/blue/gray based on data richness score)
- Company profile grid: Company Name, Legal Name, Founded (Apollo), Location (Apollo), CEO/CTO (resolved names), Funding (Apollo), Investors (Apollo — ALL of them), Employees (Apollo), Key Customers (from website logos/claims)
- **Social links bar**: LinkedIn, Twitter, GitHub, YouTube, Instagram, Blog, Status Page, Crunchbase — icons with verified URLs only
- Compliance badges (quick-view dots)
- Page-level FAQ (2-3)
- Disclaimer

**Social links display**: Show as clickable icons in a horizontal row. Only show platforms with verified URLs (status 200). Minimum 2 links required to show the bar.

### PAGE 2: Security Overview (ALWAYS INCLUDED)
4 posture cards (Encryption, Infrastructure, Access Controls, Privacy) + locked Vendor Risk Assessment + FAQ

### PAGE 3: Leadership & People (INCLUDE IF score ≥ 5 AND founders found)
**Name sources** (in order of priority):
1. Company /about or /team page → full names, titles, backgrounds
2. Apollo people search → first names + titles (obfuscated last names)
3. If neither → do NOT generate this page

Founder cards + Key Team + Company Signals (Founder-Led, Growth, Funding, Culture) + FAQ

### PAGE 4: Compliance Status (ALWAYS INCLUDED)
Badge row → Confirmed (VERIFIED only) → In Progress (STATED) → Not Detected → FAQ

**Compliance badge schema** — each badge object must have ONLY `name` and `confidence`. Do NOT include a `status` field:
```json
{ "name": "SOC 2 Type II", "confidence": "VERIFIED" }
{ "name": "GDPR",          "confidence": "STATED" }
{ "name": "ISO 27001",     "confidence": "STATED" }
{ "name": "HIPAA",         "confidence": "NOT FOUND" }
```
`confidence` values: `"VERIFIED"` | `"STATED"` | `"NOT FOUND"`

### PAGE 5: Policies & Legal (INCLUDE IF score ≥ 3)
Published policies with URLs → AI provider terms → Not found list → FAQ

### PAGE 6: Subprocessors (INCLUDE IF score ≥ 4 AND 3+ detected)
Table: Service, Purpose, Location, Status, Confidence, Detection Method → FAQ

### PAGE 7: Data Handling (INCLUDE IF score ≥ 3)
Confirmed items → Not confirmed items → FAQ

### PAGE 8: Incident Response (INCLUDE IF score ≥ 5)
Confirmed capabilities → Not confirmed → FAQ

### PAGE 9: Incident History (INCLUDE IF at least 1 public incident found)
Warning callout → Timeline entries (VERIFIED only) → CTA to DSALTA

### PAGE 10: Website Scan (INCLUDE IF score ≥ 3)
Website security cards → Email security cards → FAQ. EVERY finding MUST come from scanner.

### PAGE 11: Tech Stack (INCLUDE IF score ≥ 4 AND 3+ technologies)
Combine Apollo `technologies[]` + scanner-detected technologies. Group by category. Include open source activity if found.

### PAGE 12: Assessment Findings (INCLUDE IF score ≥ 5)
6 visible cards + 2 locked cards. Severity from scanner data ONLY.

### PAGE 13: Security FAQ (ALWAYS INCLUDED)
8-12 questions. Priority order:

| # | Question | Include if |
|---|----------|------------|
| 1 | "Is {Company} SOC 2 compliant?" | Always |
| 2 | "Has {Company} had any data breaches?" | Always — list actual incidents if found |
| 3 | "Does {Company} use data for AI training?" | Security page found |
| 4 | "Does {Company} support SSO?" | Enterprise/security page found |
| 5 | "Is {Company} GDPR compliant?" | Privacy policy found |
| 6 | "Does {Company} have a bug bounty program?" | Always — check all 5 URL patterns |
| 7 | "Where is customer data stored?" | Any hosting info found |
| 8 | "Does {Company} do penetration testing?" | Security page found |
| 9 | "What is the uptime SLA?" | Terms/SLA page found |
| 10 | "Who are {Company}'s investors?" | Apollo data — list ALL |
| 11 | "Where is {Company} headquartered?" | Apollo data |
| 12 | "Who are major customers?" | Customer logos found |

### PAGE 14: Requests & Documents (ALWAYS INCLUDED)
Questionnaire CTA → Document request grid → Available materials (verified URLs only) → Contact info (security@, general@, demo link)

---

## 8. CONTENT UNIQUENESS ENFORCEMENT

| Metric | Threshold |
|--------|-----------|
| Jaccard similarity vs any other company's same page | < 40% |
| Fixed phrases > 15 words on 3+ companies | 0 allowed |
| "Not found" items with identical wording | 0 allowed |
| FAQ answers without company-specific detail | 0 allowed |
| Minimum unique words per company | ≥ 3,000 |
| Content uniqueness score vs template | > 60% |

---

## 9. OUTPUT FORMAT

```json
{
  "company_name": "string",
  "domain": "string",
  "scan_date": "ISO 8601",
  "data_richness_score": "1-10",
  "publishing_decision": "publish | skip | needs_review",
  "company_state": "unclaimed",
  
  "social_links": {
    "website_url": "string or null",
    "linkedin_url": "string or null",
    "twitter_url": "string or null",
    "facebook_url": "string or null",
    "github_url": "string or null",
    "crunchbase_url": "string or null",
    "youtube_url": "string or null",
    "instagram_url": "string or null",
    "blog_url": "string or null",
    "status_page_url": "string or null",
    "angellist_url": "string or null",
    "changelog_url": "string or null"
  },
  
  "apollo_data": { "...": "full Apollo enrichment output" },
  
  "pages": [
    {
      "page_id": "overview",
      "included": true,
      "title": "...",
      "description": "...",
      "sections": [],
      "faqs": [],
      "nav": {},
      "sources_cited": []
    }
  ],
  
  "_sources": {
    "apollo_enrichment": true,
    "apollo_people_search": true,
    "website_crawl": ["list of URLs with status codes"],
    "web_searches": ["list of queries performed"],
    "dns_scan": true,
    "ssl_scan": true
  },
  
  "_missing": ["list of fields not populated from any source"],
  "_errors": ["list of URLs that returned 404 or errors"],
  "_cost": {
    "apollo_credits": 1,
    "web_pages_crawled": 15,
    "search_queries": 10,
    "estimated_tokens": 0,
    "estimated_cost_usd": 0.00
  }
}
```

---

## 10. QUALITY ASSURANCE CHECKLIST

Before ANY company profile is published, verify ALL of the following:

### Apollo Data Validation
- [ ] Apollo enrichment was called BEFORE any content generation
- [ ] Founded year comes from Apollo (not AI-generated)
- [ ] Funding total and all rounds come from Apollo (not AI-generated)
- [ ] ALL investors from Apollo are listed (not just top 2-3)
- [ ] Employee count comes from Apollo (not AI-generated)
- [ ] Leadership names come from Apollo search or company /about page (NEVER fabricated)
- [ ] No founder/CEO/CTO name was generated by the LLM
- [ ] Social links from Apollo are included (LinkedIn, Twitter, Facebook)

### Social Links Validation
- [ ] All social links verified with HEAD request (200 = include, 404 = exclude)
- [ ] GitHub, YouTube, Instagram, Blog, Status Page checked and verified
- [ ] No fabricated URLs (no assumed patterns like company.com/security without verification)
- [ ] Social links bar appears on Overview page with verified links only

### Scanner Data Integrity
- [ ] No scanner outputs invented by the LLM
- [ ] Every website scan finding comes from actual scanner data
- [ ] All URLs in output verified with HEAD request
- [ ] 404 URLs excluded and logged in `_errors`

### Confidence & Accuracy
- [ ] Data richness score calculated correctly
- [ ] Publishing decision gate applied
- [ ] Only applicable pages included (no empty pages)
- [ ] Every factual claim has a confidence label
- [ ] Every VERIFIED claim links to an accessible source
- [ ] No HIGH-RISK claims below VERIFIED confidence
- [ ] No forbidden language (likely, probably, appears to, indicates)

### FAQ Error Prevention
- [ ] Bug bounty: checked all 5 URL patterns before answering
- [ ] Data breaches: searched all 7 query variations
- [ ] GDPR: uses STATED (not VERIFIED) if only privacy policy found
- [ ] GDPR: no hedging language ("indicate prepared")
- [ ] Pen testing: cites specific evidence, not "SOC 2 typically requires"
- [ ] All FAQ answers contain ≥ 1 company-specific detail
- [ ] No FAQ question duplicated across pages

### Content Quality
- [ ] Unclaimed page disclaimer present on every page
- [ ] Jaccard similarity < 40% vs nearest neighbor company
- [ ] No fixed phrase > 15 words shared with 3+ companies
- [ ] All "not found" statements are company-specific (reference domain + pages checked)
- [ ] Total unique words ≥ 3,000 per company
- [ ] Page load time < 2 seconds
- [ ] Sitemap updated with new URLs
- [ ] Schema markup (FAQ, Organization) applied

---

## 11. REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03-13 | Initial prompt with 14 pages, confidence labels, uniqueness rules |
| v2.0 | 2026-03-13 | Added: publishing gate, dynamic page inclusion, scanner/LLM separation, company state modes, high-risk evidence thresholds, page intent differentiation, FAQ deduplication, sparse data handling, QA checklist |
| v3.0 | 2026-03-18 | Added: Apollo enrichment as Phase 1 ground truth, social links discovery, FAQ error prevention rules, leadership name resolution, URL validation, `_errors` and `_cost` tracking. Fixed Mintlify audit errors. |
| v3.1 | 2026-03-18 | Rewrote data pipeline as WATERFALL approach: Apollo first → check what's missing → scanner fills gaps → web search only for uncovered categories. Added `_needs_search` checklist showing exactly which fields Apollo covers vs which need scanning. Added skip logic for web searches when Apollo already has the data. Clarified Apollo social links don't need HEAD verification. Added 2.2.5 waterfall summary pseudocode. |
