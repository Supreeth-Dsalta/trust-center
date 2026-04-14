/**
 * DSALTA AI Agent — Prompt 5
 *
 * Key difference from prompt 4: Apollo data is pre-fetched BEFORE the agentic
 * loop and injected into the initial user message as structured ground truth.
 * Claude never needs to call apollo_enrich_organization or apollo_people_search
 * as tools — it receives the full data from turn 1 and cannot lose it to context
 * pruning or truncation. This eliminates hallucinated / truncated tech stacks.
 *
 * Tools available to Claude (Apollo removed):
 *   - gemini_search       (Gemini 2.0 Flash with Google grounding)
 *   - fetch_url
 *   - dns_lookup
 *   - check_tls
 *   - analyze_page_source
 *   - render_page         (Playwright — JS-rendered pages)
 *
 * Auth: GCP service account
 * Env vars (optional):
 *   GOOGLE_CLOUD_PROJECT       — GCP project ID (default: "dsalta")
 *   GOOGLE_CLOUD_LOCATION      — Vertex AI location (default: "us-east5")
 *   GOOGLE_APPLICATION_CREDENTIALS — path to service account key
 */

import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import * as dnsPromises from "dns/promises";
import * as tls from "tls";
import { writeFileSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { chromium } from "playwright";

// ─── Config ────────────────────────────────────────────────────────────────────

const APOLLO_API_KEY = "patbKNgHIW9KOoznJIB6zw";

const MODEL           = "claude-opus-4-6";
const GEMINI_MODEL    = "gemini-2.0-flash-001";
const PROJECT_ID      = process.env.GOOGLE_CLOUD_PROJECT  ?? "dsalta";
const LOCATION        = process.env.GOOGLE_CLOUD_LOCATION ?? "us-east5";
const GEMINI_LOCATION = "us-central1";

const ROOT_DIR  = resolve(__dirname, "../../../../..");
const CRED_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : join(ROOT_DIR, "service-account-key.json");

process.env.GOOGLE_APPLICATION_CREDENTIALS = CRED_PATH;
console.log(`Using service account: ${CRED_PATH}`);

const COMPANIES = [
  { name: "Mintlify", domain: "mintlify.com" },
];

const MAX_TURNS = 40;
const WRAP_UP_AFTER_TOOL_TURNS      = 6;
const MAX_TOOL_RESULT_TURNS_IN_CONTEXT = 4;

// ─── Vertex AI auth ───────────────────────────────────────────────────────────

const auth = new GoogleAuth({
  keyFile: CRED_PATH,
  scopes:  ["https://www.googleapis.com/auth/cloud-platform"],
});

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = readFileSync(
  join(__dirname, "DSALTA-AI-Agent-Prompt-v3.md"),
  "utf-8"
);

// ─── Apollo fields the v3 waterfall expects Apollo to cover ───────────────────

const APOLLO_EXPECTED_FIELDS: Record<string, string> = {
  company_name:           "Company name",
  founded_year:           "Founded year",
  hq_city:                "HQ city",
  hq_country:             "HQ country",
  employee_count:         "Employee count",
  total_funding:          "Total funding",
  technologies:           "Tech stack",
  linkedin_url:           "LinkedIn URL",
  twitter_url:            "Twitter/X URL",
  facebook_url:           "Facebook URL",
  description_seed:       "Company description",
  headcount_growth:       "Headcount growth (6/12/24 mo)",
  departmental_headcount: "Departmental headcount",
};

const ALWAYS_SEARCH_FIELDS: string[] = [
  "founders / leadership names",
  "leader backgrounds",
  "compliance certifications (SOC 2, ISO, HIPAA, GDPR)",
  "security posture",
  "privacy policy",
  "terms of service",
  "DPA",
  "SLA",
  "subprocessors",
  "data handling",
  "incident history",
  "incident response / status page",
  "website security headers",
  "bug bounty / responsible disclosure",
  "customer logos",
];

// ─── Resolution Logger ────────────────────────────────────────────────────────

interface ResolutionEntry {
  field:        string;
  label:        string;
  apollo_value: any;
  found_value:  any;
  found_via:    string | null;
  source_url:   string | null;
}

class ResolutionLogger {
  private entries = new Map<string, ResolutionEntry>();

  markApolloField(field: string, label: string, value: any) {
    this.entries.set(field, {
      field,
      label,
      apollo_value: value ?? null,
      found_value:  value ?? null,
      found_via:    value != null ? "apollo" : null,
      source_url:   null,
    });
  }

  markAlwaysSearch(field: string) {
    if (!this.entries.has(field)) {
      this.entries.set(field, {
        field,
        label:        field,
        apollo_value: null,
        found_value:  null,
        found_via:    null,
        source_url:   null,
      });
    }
  }

  resolveField(field: string, value: any, via: string, sourceUrl?: string) {
    const e = this.entries.get(field);
    if (e) {
      e.found_value = value;
      e.found_via   = via;
      e.source_url  = sourceUrl ?? null;
    }
  }

  reconcileWithFinalOutput(finalJson: any) {
    for (const [field, entry] of this.entries) {
      if (entry.found_value !== null) continue;
      const candidate = finalJson?.[field] ?? finalJson?.apollo_data?.[field] ?? null;
      if (candidate !== null && candidate !== undefined) {
        entry.found_value = candidate;
        entry.found_via   = "claude_final_output";
      }
    }
  }

  getMissingFromApollo(): ResolutionEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.apollo_value === null);
  }

  printReport() {
    const missing = this.getMissingFromApollo();
    const sep = "═".repeat(72);

    console.log(`\n${sep}`);
    console.log(`  APOLLO MISSING FIELDS + RESOLUTION REPORT  (${missing.length} fields)`);
    console.log(sep);

    if (missing.length === 0) {
      console.log("  ✓ All tracked fields were found in Apollo enrichment.");
      console.log(`${sep}\n`);
      return;
    }

    for (const e of missing) {
      const resolved   = e.found_value !== null && e.found_value !== undefined;
      const icon       = resolved ? "✓" : "✗";
      const displayVal = resolved
        ? (typeof e.found_value === "string"
            ? e.found_value.slice(0, 300)
            : JSON.stringify(e.found_value).slice(0, 300))
        : "NOT FOUND by any source";

      console.log(`\n  ${icon} ${e.label}`);
      console.log(`      Apollo    : NOT FOUND (null)`);
      console.log(`      Found via : ${e.found_via ?? "—"}`);
      console.log(`      Answer    : ${displayVal}`);
      if (e.source_url) console.log(`      Source    : ${e.source_url}`);
    }

    console.log(`\n${sep}\n`);
  }
}

// ─── Tool Implementations ─────────────────────────────────────────────────────

async function toolApolloEnrich(domain: string): Promise<any> {
  try {
    const res = await axios.post(
      "https://api.apollo.io/api/v1/organizations/enrich",
      { domain },
      {
        headers: {
          "Content-Type":  "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key":     APOLLO_API_KEY,
        },
        timeout: 15000,
      }
    );
    return res.data;
  } catch (err: any) {
    return { error: err.response?.data ?? err.message };
  }
}

async function toolApolloPeopleSearch(domain: string): Promise<any> {
  try {
    const res = await axios.post(
      "https://api.apollo.io/api/v1/mixed_people/api_search",
      {
        q_organization_domains_list: [domain],
        person_seniorities: ["c_suite", "founder", "owner", "vp", "director"],
        per_page: 10,
      },
      {
        headers: {
          "Content-Type":  "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key":     APOLLO_API_KEY,
        },
        timeout: 15000,
      }
    );
    return res.data;
  } catch (err: any) {
    return { error: err.response?.data ?? err.message };
  }
}

async function toolFetchUrl(url: string, method: "GET" | "HEAD" = "HEAD"): Promise<any> {
  try {
    const res = await axios({ method, url, timeout: 10000, maxRedirects: 5 });
    const contentExcerpt = method === "GET" && typeof res.data === "string"
      ? res.data.slice(0, 3000)
      : null;
    return {
      url,
      status:           res.status,
      final_url:        res.request?.res?.responseUrl ?? url,
      content_type:     res.headers["content-type"] ?? null,
      content_excerpt:  contentExcerpt,
      headers: {
        server:                    res.headers["server"] ?? null,
        x_powered_by:              res.headers["x-powered-by"] ?? null,
        strict_transport_security: res.headers["strict-transport-security"] ?? null,
        content_security_policy:   res.headers["content-security-policy"] ?? null,
        x_frame_options:           res.headers["x-frame-options"] ?? null,
        x_content_type_options:    res.headers["x-content-type-options"] ?? null,
        permissions_policy:        res.headers["permissions-policy"] ?? null,
        set_cookie:                res.headers["set-cookie"] ?? null,
      },
    };
  } catch (err: any) {
    return {
      url,
      status:          err.response?.status ?? 0,
      error:           err.message,
      content_excerpt: null,
      headers:         {},
    };
  }
}

async function toolDnsLookup(domain: string): Promise<any> {
  const results: any = { domain };

  try {
    const txt = await dnsPromises.resolveTxt(domain);
    const spf  = txt.find((r) => r.join("").startsWith("v=spf1"));
    results.spf = spf ? { present: true, record: spf.join("") } : { present: false };

    try {
      const dmarc    = await dnsPromises.resolveTxt(`_dmarc.${domain}`);
      const dmarcRec = dmarc[0]?.join("") ?? null;
      results.dmarc  = {
        present: true,
        record:  dmarcRec,
        policy:  dmarcRec?.match(/p=(\w+)/)?.[1] ?? "unknown",
      };
    } catch {
      results.dmarc = { present: false };
    }
  } catch (err: any) {
    results.spf   = { present: false, error: err.message };
    results.dmarc = { present: false };
  }

  for (const selector of ["google", "default", "k1", "mail", "dkim", "s1", "s2"]) {
    try {
      const dkim = await dnsPromises.resolveTxt(`${selector}._domainkey.${domain}`);
      results.dkim = { present: true, selector, record: dkim[0]?.join("").slice(0, 100) };
      break;
    } catch {
      results.dkim = { present: false };
    }
  }

  try {
    const mx   = await dnsPromises.resolveMx(domain);
    results.mx = mx.map((r) => ({ exchange: r.exchange, priority: r.priority }));
  } catch (err: any) {
    results.mx = { error: err.message };
  }

  return results;
}

async function toolCheckTls(domain: string): Promise<any> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: domain, port: 443, servername: domain, rejectUnauthorized: false },
      () => {
        const cert   = socket.getPeerCertificate(true);
        const result = {
          domain,
          tls_version:         socket.getProtocol(),
          cert_valid:          socket.authorized,
          cert_subject:        cert?.subject?.CN ?? null,
          cert_issuer:         cert?.issuer?.O  ?? null,
          cert_valid_from:     cert?.valid_from ?? null,
          cert_valid_to:       cert?.valid_to   ?? null,
          cert_days_remaining: cert?.valid_to
            ? Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000)
            : null,
        };
        socket.destroy();
        resolve(result);
      }
    );
    socket.on("error", (err: Error) => resolve({ domain, error: err.message }));
    socket.setTimeout(8000, () => { socket.destroy(); resolve({ domain, error: "timeout" }); });
  });
}

async function toolAnalyzePageSource(url: string): Promise<any> {
  const SCRIPT_PATTERNS: Record<string, { pattern: RegExp; category: string }> = {
    "PostHog":   { pattern: /posthog/i,                  category: "analytics" },
    "GA4":       { pattern: /googletagmanager|gtag/i,    category: "analytics" },
    "Mixpanel":  { pattern: /mixpanel/i,                 category: "analytics" },
    "Amplitude": { pattern: /amplitude/i,                category: "analytics" },
    "Segment":   { pattern: /segment\.io|cdn\.segment/i, category: "analytics" },
    "Heap":      { pattern: /heapanalytics|heap\.js/i,   category: "analytics" },
    "Hotjar":    { pattern: /hotjar/i,                   category: "analytics" },
    "Stripe":    { pattern: /stripe\.js|js\.stripe/i,    category: "payments" },
    "PayPal":    { pattern: /paypal\.com\/sdk/i,         category: "payments" },
    "Paddle":    { pattern: /paddle\.js/i,               category: "payments" },
    "Intercom":  { pattern: /intercomcdn|intercom\.io/i, category: "chat" },
    "Drift":     { pattern: /drift\.com/i,               category: "chat" },
    "Crisp":     { pattern: /crisp\.chat/i,              category: "chat" },
    "Zendesk":   { pattern: /zendesk/i,                  category: "chat" },
    "Auth0":     { pattern: /auth0/i,                    category: "auth" },
    "Clerk":     { pattern: /clerk\.dev|clerk\.com/i,    category: "auth" },
    "Stytch":    { pattern: /stytch/i,                   category: "auth" },
    "Sentry":    { pattern: /sentry\.io|browser\.sentry/i, category: "monitoring" },
    "Datadog":   { pattern: /datadoghq|dd-rum/i,         category: "monitoring" },
  };

  const FRAMEWORK_PATTERNS: Record<string, RegExp> = {
    nextjs:  /_next\//,
    nuxt:    /__nuxt|_nuxt\//,
    react:   /react\.production|react-dom/,
    vue:     /vue\.runtime|vue\.min\.js/,
    angular: /zone\.js|angular\.min/,
    svelte:  /svelte/,
  };

  const CDN_PATTERNS: Record<string, RegExp> = {
    cloudfront: /cloudfront\.net/,
    cloudflare: /cdnjs\.cloudflare|\.cfpage/,
    fastly:     /fastly\.net/,
    jsdelivr:   /jsdelivr\.net/,
    unpkg:      /unpkg\.com/,
    vercel:     /vercel-cdn|\.vercel\.app/,
  };

  try {
    const res  = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DSALTABot/1.0)" },
    });
    const html = typeof res.data === "string" ? res.data : "";

    const detected_scripts: Array<{ service: string; category: string }> = [];
    for (const [service, { pattern, category }] of Object.entries(SCRIPT_PATTERNS)) {
      if (pattern.test(html)) detected_scripts.push({ service, category });
    }

    let detected_framework = "unknown";
    for (const [fw, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
      if (pattern.test(html)) { detected_framework = fw; break; }
    }

    const detected_cdn: string[] = [];
    for (const [cdn, pattern] of Object.entries(CDN_PATTERNS)) {
      if (pattern.test(html)) detected_cdn.push(cdn);
    }

    const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] ?? "";
    const linkMatches = [...footerMatch.matchAll(/href="([^"]+)"[^>]*>([^<]+)</g)];
    const footer_links = linkMatches.slice(0, 20).map(([, href, text]) => ({
      href: href.startsWith("http") ? href : `${url.replace(/\/$/, "")}${href}`,
      text: text.trim(),
    }));

    const setCookieHeader      = res.headers["set-cookie"] ?? [];
    const titleMatch           = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const metaDescMatch        = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
    const ogImageMatch         = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);

    return {
      url,
      status:                 res.status,
      title:                  titleMatch?.[1]?.trim()    ?? null,
      meta_description:       metaDescMatch?.[1]?.trim() ?? null,
      og_image:               ogImageMatch?.[1]?.trim()  ?? null,
      detected_scripts,
      detected_framework,
      detected_cdn,
      footer_links,
      cookies_before_consent: Array.isArray(setCookieHeader) ? setCookieHeader.length : 0,
    };
  } catch (err: any) {
    return { url, error: err.message, status: err.response?.status ?? 0 };
  }
}

// ─── Playwright render tool (JS-rendered pages) ───────────────────────────────

async function toolRenderPage(url: string): Promise<any> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    const title   = await page.title();
    const text    = await page.evaluate(() => document.body?.innerText ?? "");
    const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 4000);
    return { url, status: 200, title, text_excerpt: excerpt };
  } catch (err: any) {
    return { url, error: err.message, status: 0 };
  } finally {
    await browser?.close();
  }
}

// ─── Gemini Google Search ─────────────────────────────────────────────────────

async function toolGeminiSearch(query: string): Promise<any> {
  try {
    const authClient    = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const token         = tokenResponse.token!;
    const url           = `https://${GEMINI_LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${GEMINI_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

    const res = await axios.post(
      url,
      {
        contents: [{ role: "user", parts: [{ text: query }] }],
        tools:    [{ google_search: {} }],
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 30000 }
    );

    const candidate = res.data.candidates?.[0];
    const answer    = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "";
    const chunks    = candidate?.groundingMetadata?.groundingChunks ?? [];
    const sources   = chunks.slice(0, 5).map((c: any) => ({ title: c.web?.title ?? null, url: c.web?.uri ?? null }));
    const usage     = res.data.usageMetadata ?? null;

    return { query, answer, sources, usage };
  } catch (err: any) {
    return { query, error: err.response?.data ?? err.message, answer: null, sources: [], usage: null };
  }
}

// ─── Tool Definitions (Apollo tools removed — data is pre-seeded) ─────────────

const CUSTOM_TOOL_DEFINITIONS = [
  {
    name: "fetch_url",
    description:
      "Fetch a URL with HEAD (check existence/status/headers) or GET (retrieve full content). " +
      "Use HEAD for URL validation (200=found, 404=not found). Use GET to read page content " +
      "(privacy policy, security page, about page, etc.).",
    input_schema: {
      type: "object",
      properties: {
        url:    { type: "string", description: "Full URL including https://" },
        method: { type: "string", enum: ["GET", "HEAD"], description: "HEAD=check existence, GET=read content" },
      },
      required: ["url"],
    },
  },
  {
    name: "dns_lookup",
    description:
      "Check DNS records for a domain: SPF, DKIM, DMARC (with policy), and MX records. " +
      "Use this for email security assessment.",
    input_schema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain to check DNS records for" },
      },
      required: ["domain"],
    },
  },
  {
    name: "check_tls",
    description:
      "Check TLS/SSL configuration for a domain: TLS version, certificate validity, " +
      "expiry date, days remaining, and issuer.",
    input_schema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain to check TLS for (no https://)" },
      },
      required: ["domain"],
    },
  },
  {
    name: "analyze_page_source",
    description:
      "Fetch a page and analyze its HTML source to detect: third-party scripts (analytics, " +
      "payments, chat, auth), JS framework, CDN providers, footer links, cookie count, " +
      "meta description, and og:image. Use on the homepage and key pages.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL of the page to analyze" },
      },
      required: ["url"],
    },
  },
  {
    name: "render_page",
    description:
      "Launch a headless Chromium browser, fully render the page (executes JavaScript), " +
      "and return the visible text content. Use this for JavaScript-rendered pages where " +
      "fetch_url or analyze_page_source return empty or shell content — e.g. trust centers " +
      "(Drata, Vanta, Tugboat Logic), compliance portals, and single-page apps (SPAs). " +
      "Slower than fetch_url (~3-5s) so only call when the page is known to be JS-rendered.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL of the JS-rendered page to read" },
      },
      required: ["url"],
    },
  },
  {
    name: "gemini_search",
    description:
      "Search the web using Gemini 2.0 Flash with Google Search grounding. Returns a " +
      "grounded answer with source URLs. Use for: (1) verifying non-Apollo social media URLs " +
      "(e.g. 'Is youtube.com/@mintlify an active Mintlify YouTube channel with videos?'), " +
      "(2) resolving obfuscated founder names from Apollo (e.g. 'Han Wang Mintlify co-founder full name'), " +
      "(3) compliance certs, incidents, bug bounty, and other fields Apollo doesn't cover.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search query" },
      },
      required: ["query"],
    },
  },
];

// ─── Tool Dispatcher ──────────────────────────────────────────────────────────

interface ToolCallLog {
  tool:           string;
  input:          any;
  result_summary: string;
  timestamp:      string;
}

interface AgentCounters {
  geminiInputTokens:  number;
  geminiOutputTokens: number;
  geminiSearchCalls:  number;
}

async function dispatchTool(
  name: string,
  input: any,
  logger: ResolutionLogger,
  toolLog: ToolCallLog[],
  counters: AgentCounters
): Promise<string> {
  let result: any;

  switch (name) {
    case "fetch_url":
      result = await toolFetchUrl(input.url, input.method ?? "HEAD");
      if (result.status === 200 && input.method === "GET" && result.content_excerpt) {
        const url = input.url.toLowerCase();
        if (url.includes("privacy"))      logger.resolveField("privacy policy",    result.url, "fetch_url", input.url);
        if (url.includes("terms"))        logger.resolveField("terms of service",  result.url, "fetch_url", input.url);
        if (url.includes("/dpa"))         logger.resolveField("DPA",               result.url, "fetch_url", input.url);
        if (url.includes("/sla"))         logger.resolveField("SLA",               result.url, "fetch_url", input.url);
        if (url.includes("security"))     logger.resolveField("security posture",  result.url, "fetch_url", input.url);
        if (url.includes("status"))       logger.resolveField("incident response / status page", result.url, "fetch_url", input.url);
        if (url.includes("about") || url.includes("team")) {
          logger.resolveField("founders / leadership names", "Found on about/team page", "fetch_url", input.url);
          logger.resolveField("leader backgrounds",          "Found on about/team page", "fetch_url", input.url);
        }
        if (url.includes("bug-bounty") || url.includes("responsible-disclosure") || url.includes("security.txt")) {
          logger.resolveField("bug bounty / responsible disclosure", result.url, "fetch_url", input.url);
        }
      }
      break;

    case "dns_lookup":
      result = await toolDnsLookup(input.domain);
      if (result.spf?.present || result.dmarc?.present || result.dkim?.present) {
        logger.resolveField(
          "website security headers",
          `SPF: ${result.spf?.present ? "present" : "absent"}, ` +
          `DKIM: ${result.dkim?.present ? "present" : "absent"}, ` +
          `DMARC: ${result.dmarc?.present ? `present (policy=${result.dmarc.policy})` : "absent"}`,
          "dns_lookup"
        );
      }
      break;

    case "check_tls":
      result = await toolCheckTls(input.domain);
      if (!result.error) {
        logger.resolveField(
          "website security headers",
          `TLS ${result.tls_version}, cert valid=${result.cert_valid}, expires ${result.cert_valid_to} (${result.cert_days_remaining}d remaining)`,
          "check_tls"
        );
      }
      break;

    case "analyze_page_source":
      result = await toolAnalyzePageSource(input.url);
      if (result.detected_scripts?.length) {
        logger.resolveField(
          "subprocessors",
          result.detected_scripts.map((s: any) => s.service).join(", "),
          "analyze_page_source",
          input.url
        );
      }
      break;

    case "render_page":
      result = await toolRenderPage(input.url);
      if (result.text_excerpt) {
        const u = input.url.toLowerCase();
        if (u.includes("security") || u.includes("trust") || u.includes("compliance"))
          logger.resolveField("security posture", result.url, "render_page", input.url);
        if (u.includes("privacy"))
          logger.resolveField("privacy policy", result.url, "render_page", input.url);
        if (u.includes("customer") || u.includes("case"))
          logger.resolveField("customer logos", result.text_excerpt.slice(0, 300), "render_page", input.url);
      }
      break;

    case "gemini_search":
      result = await toolGeminiSearch(input.query);
      counters.geminiSearchCalls++;
      if (result.usage) {
        counters.geminiInputTokens  += result.usage.promptTokenCount      ?? 0;
        counters.geminiOutputTokens += result.usage.candidatesTokenCount  ?? 0;
      }
      if (result.answer) {
        const sourceUrl = result.sources?.[0]?.url ?? null;
        updateLoggerFromWebQuery(input.query, result.answer.slice(0, 400), sourceUrl, logger);
      }
      break;

    default:
      result = { error: `Unknown tool: ${name}` };
  }

  const resultStr     = JSON.stringify(result);
  const summaryLength = 120;
  toolLog.push({
    tool:           name,
    input,
    result_summary: resultStr.slice(0, summaryLength) + (resultStr.length > summaryLength ? "…" : ""),
    timestamp:      new Date().toISOString(),
  });

  console.log(`    [tool:${name}] ${toolLog[toolLog.length - 1].result_summary}`);
  return resultStr;
}

// ─── Helper: update logger from a web query string ────────────────────────────

function updateLoggerFromWebQuery(query: string, snippet: string, sourceUrl: string | null, logger: ResolutionLogger) {
  const q = query.toLowerCase();
  if (!snippet) return;

  if (/soc.?2|iso.?27001|hipaa|gdpr.*compli|certif/i.test(q))
    logger.resolveField("compliance certifications (SOC 2, ISO, HIPAA, GDPR)", snippet, "web_search", sourceUrl ?? undefined);
  if (/breach|incident|security event|cve|vulnerab/i.test(q))
    logger.resolveField("incident history", snippet, "web_search", sourceUrl ?? undefined);
  if (/bug.?bounty|responsible.?disclosure|hackerone|bugcrowd/i.test(q))
    logger.resolveField("bug bounty / responsible disclosure", snippet, "web_search", sourceUrl ?? undefined);
  if (/customer|case.?stud|client/i.test(q))
    logger.resolveField("customer logos", snippet, "web_search", sourceUrl ?? undefined);
  if (/founder|ceo|cto|leadership|team/i.test(q)) {
    logger.resolveField("founders / leadership names", snippet, "web_search", sourceUrl ?? undefined);
    logger.resolveField("leader backgrounds",          snippet, "web_search", sourceUrl ?? undefined);
  }
  if (/pentest|penetration.?test/i.test(q))
    logger.resolveField("security posture", snippet, "web_search", sourceUrl ?? undefined);
  if (/subprocessor|third.?party|vendor/i.test(q))
    logger.resolveField("subprocessors", snippet, "web_search", sourceUrl ?? undefined);
  if (/data.?retention|data.?handl|data.?resid/i.test(q))
    logger.resolveField("data handling", snippet, "web_search", sourceUrl ?? undefined);
}

// ─── Context Pruner ───────────────────────────────────────────────────────────

function pruneToolResults(messages: any[]): any[] {
  const toolResultIndices = messages
    .map((m, i) =>
      m.role === "user" &&
      Array.isArray(m.content) &&
      m.content.some((b: any) => b.type === "tool_result")
        ? i
        : -1
    )
    .filter((i) => i !== -1);

  const toPrune = new Set(toolResultIndices.slice(0, -MAX_TOOL_RESULT_TURNS_IN_CONTEXT));

  return messages.map((m, i) => {
    if (!toPrune.has(i)) return m;
    return {
      ...m,
      content: m.content.map((b: any) =>
        b.type === "tool_result"
          ? { ...b, content: "[result pruned to save context]" }
          : b
      ),
    };
  });
}

// ─── Apollo Pre-fetch ─────────────────────────────────────────────────────────
// Fetches Apollo data before the agentic loop and returns a structured fieldMap
// and people list. The fieldMap is injected into the initial user message so
// Claude has authoritative ground-truth data from turn 1 — no context pruning
// risk, no truncation, no hallucination.

async function prefetchApollo(
  domain: string,
  logger: ResolutionLogger,
  toolLog: ToolCallLog[]
): Promise<{ fieldMap: Record<string, any>; peopleList: string }> {
  console.log(`  [apollo pre-fetch] Calling organizations_enrich for ${domain}...`);
  const enrichRaw = await toolApolloEnrich(domain);

  let fieldMap: Record<string, any> = {};

  if (enrichRaw?.organization) {
    const org = enrichRaw.organization;

    const full = org.current_technologies;
    let techList: string[] | null = null;
    if (full?.length) {
      techList = full.map((t: any) => t.name ?? t).filter(Boolean);
      console.log(`  [apollo pre-fetch] technologies (${techList.length}): ${techList.join(", ")}`);
    } else if (org.technologies?.length) {
      techList = org.technologies;
      console.log(`  [apollo pre-fetch] technologies fallback (${techList.length}): ${techList.join(", ")}`);
    }

    fieldMap = {
      company_name:           org.name,
      founded_year:           org.founded_year,
      hq_city:                org.city,
      hq_country:             org.country,
      employee_count:         org.estimated_num_employees,
      total_funding:          org.total_funding,
      technologies:           techList,
      logo_url:               org.photo_url ?? org.logo_url ?? null,
      linkedin_url:           org.linkedin_url,
      twitter_url:            org.twitter_url,
      facebook_url:           org.facebook_url,
      description_seed:       org.short_description,
      headcount_growth:       org.growth_attributes ?? null,
      departmental_headcount: org.organization_headcount_by_department ?? null,
    };

    for (const [field, label] of Object.entries(APOLLO_EXPECTED_FIELDS)) {
      const value = fieldMap[field];
      logger.markApolloField(field, label, value ?? null);
      if (value == null) console.log(`  ⚠ NOT FOUND IN APOLLO: ${label}`);
    }

    for (const field of ALWAYS_SEARCH_FIELDS) {
      logger.markAlwaysSearch(field);
    }
  } else {
    console.warn("  ⚠ Apollo enrich returned no organization data");
  }

  toolLog.push({
    tool:           "apollo_enrich_organization",
    input:          { domain },
    result_summary: `fieldMap keys: ${Object.keys(fieldMap).join(", ")}`,
    timestamp:      new Date().toISOString(),
  });

  console.log(`  [apollo pre-fetch] Calling people search for ${domain}...`);
  const peopleRaw = await toolApolloPeopleSearch(domain);
  let peopleList  = "";

  if (peopleRaw?.people?.length) {
    peopleList = peopleRaw.people.map((p: any) => {
      const lastName     = p.last_name_obfuscated ?? p.last_name ?? "***";
      const isObfuscated = lastName.includes("*");
      return `${p.first_name} ${lastName} — ${p.title}${isObfuscated ? " [OBFUSCATED — resolve via gemini_search]" : ""}`;
    }).join("\n");
    logger.resolveField("founders / leadership names", peopleList, "apollo_people_search");
  }

  toolLog.push({
    tool:           "apollo_people_search",
    input:          { domain },
    result_summary: peopleList ? peopleList.slice(0, 120) : "no people returned",
    timestamp:      new Date().toISOString(),
  });

  return { fieldMap, peopleList };
}

// ─── Agentic Loop ──────────────────────────────────────────────────────────────

async function runAgent(company: { name: string; domain: string }): Promise<any> {
  const logger:   ResolutionLogger = new ResolutionLogger();
  const toolLog:  ToolCallLog[]    = [];
  const counters: AgentCounters    = { geminiInputTokens: 0, geminiOutputTokens: 0, geminiSearchCalls: 0 };

  console.log(`\n${"─".repeat(72)}`);
  console.log(`  DSALTA Agent — ${company.name} (${company.domain})`);
  console.log(`${"─".repeat(72)}\n`);

  // Pre-fetch Apollo before the loop — injected as ground truth into the initial message.
  const { fieldMap, peopleList } = await prefetchApollo(company.domain, logger, toolLog);

  const apolloBlock = [
    "## Apollo Ground Truth (pre-fetched — treat as authoritative, do not re-call Apollo tools)",
    "```json",
    JSON.stringify(fieldMap, null, 2),
    "```",
    peopleList
      ? `\n## Apollo People\n${peopleList}`
      : "\n## Apollo People\n(none returned)",
  ].join("\n");

  const messages: any[] = [
    {
      role:    "user",
      content:
        `Generate a complete DSALTA security profile for ${company.name} (domain: ${company.domain}).\n\n` +
        `${apolloBlock}\n\n` +
        `Follow the v3 waterfall:\n` +
        `1. Apollo data is already provided above — copy all fields into apollo_data verbatim. Do NOT call apollo_enrich_organization or apollo_people_search.\n` +
        `2. Use the Apollo checklist to identify what is missing.\n` +
        `3. Run scanner tools (fetch_url, dns_lookup, check_tls, analyze_page_source) to fill gaps.\n` +
        `4. Discover additional social/web URLs Apollo doesn't cover: GitHub, YouTube, Instagram, Crunchbase, blog, status page, changelog — use fetch_url HEAD + gemini_search per Section 2.1.4.\n` +
        `5. Use web_search / gemini_search for fields Apollo did not return (compliance, incidents, bug bounty, customers).\n` +
        `6. Return the final profile as a single valid JSON object matching the v3 output schema (Section 9).`,
    },
  ];

  let turns             = 0;
  let toolCallTurns     = 0;
  let finalJson         = null;
  let totalInputTokens  = 0;
  let totalOutputTokens = 0;

  while (turns < MAX_TURNS) {
    turns++;
    console.log(`\n  [turn ${turns}] Calling Claude...`);

    let response: any;
    try {
      const authClient    = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      const token         = tokenResponse.token!;
      const url           = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

      const isFinalTurn = toolCallTurns >= WRAP_UP_AFTER_TOOL_TURNS - 1;
      const maxTokens   = isFinalTurn ? 32768 : 4096;

      const res = await axios.post(
        url,
        {
          anthropic_version: "vertex-2023-10-16",
          system:            SYSTEM_PROMPT,
          messages:          pruneToolResults(messages),
          max_tokens:        maxTokens,
          tools:             CUSTOM_TOOL_DEFINITIONS,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 300000 }
      );
      response = res.data;
      totalInputTokens  += response.usage?.input_tokens  ?? 0;
      totalOutputTokens += response.usage?.output_tokens ?? 0;
    } catch (err: any) {
      const isTimeout = err.code === "ECONNABORTED" || (err.message as string)?.includes("timeout");
      if (isTimeout) {
        console.warn(`  ⚠ Timeout on turn ${turns} — retrying once...`);
        turns--;
        continue;
      }
      console.error("  Claude API error:", err.response?.data ?? err.message);
      break;
    }

    const stopReason = response.stop_reason;
    const content    = response.content ?? [];

    messages.push({ role: "assistant", content });

    if (stopReason === "end_turn" || stopReason === "max_tokens") {
      if (stopReason === "max_tokens") {
        console.warn("  ⚠ Claude hit max_tokens — attempting to extract partial output...");
      }
      const textBlock = [...content].reverse().find((b: any) => b.type === "text");
      if (textBlock?.text) {
        try {
          const cleaned = textBlock.text
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          finalJson = JSON.parse(cleaned);
        } catch {
          finalJson = { raw_output: textBlock.text };
        }
      }
      break;
    }

    if (stopReason === "tool_use") {
      toolCallTurns++;
      const toolUseBlocks = content.filter((b: any) => b.type === "tool_use");
      const toolResults: any[] = [];

      await Promise.all(
        toolUseBlocks.map(async (block: any) => {
          console.log(`  → ${block.name}(${JSON.stringify(block.input).slice(0, 80)})`);
          const resultStr = await dispatchTool(block.name, block.input, logger, toolLog, counters);
          const MAX_RESULT = 3000;
          const trimmed = resultStr.length > MAX_RESULT
            ? resultStr.slice(0, MAX_RESULT) + `… [truncated ${resultStr.length - MAX_RESULT} chars]`
            : resultStr;
          toolResults.push({
            type:        "tool_result",
            tool_use_id: block.id,
            content:     trimmed,
          });
        })
      );

      const userContent: any[] = [...toolResults];
      if (toolCallTurns >= WRAP_UP_AFTER_TOOL_TURNS) {
        console.log(`  [wrap-up] Injecting final-output instruction after ${toolCallTurns} tool-call turns.`);
        userContent.push({
          type: "text",
          text:
            "You have gathered sufficient data. Do NOT call any more tools. " +
            "Generate the final JSON profile now, exactly matching the output schema in Section 9 of your instructions. " +
            "Output ONLY the raw JSON — no markdown fences, no explanation.",
        });
      }

      messages.push({ role: "user", content: userContent });
      continue;
    }

    console.warn(`  Unexpected stop_reason: ${stopReason}`);
    break;
  }

  if (turns >= MAX_TURNS) console.warn(`  ⚠ Hit MAX_TURNS (${MAX_TURNS})`);

  if (finalJson) logger.reconcileWithFinalOutput(finalJson);

  // ─── Console Report ───────────────────────────────────────────────────────
  logger.printReport();

  const byTool: Record<string, number> = {};
  for (const t of toolLog) byTool[t.tool] = (byTool[t.tool] ?? 0) + 1;

  // ─── Cost Report ──────────────────────────────────────────────────────────
  const PRICE_INPUT_PER_M         = 15.00;
  const PRICE_OUTPUT_PER_M        = 75.00;
  const GEMINI_PRICE_INPUT_PER_M  = 0.075;
  const GEMINI_PRICE_OUTPUT_PER_M = 0.30;
  const GEMINI_PRICE_SEARCH       = 0.035;

  const llmInputCost  = (totalInputTokens  / 1_000_000) * PRICE_INPUT_PER_M;
  const llmOutputCost = (totalOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
  const llmTotalCost  = llmInputCost + llmOutputCost;

  const geminiInputCost  = (counters.geminiInputTokens  / 1_000_000) * GEMINI_PRICE_INPUT_PER_M;
  const geminiOutputCost = (counters.geminiOutputTokens / 1_000_000) * GEMINI_PRICE_OUTPUT_PER_M;
  const geminiSearchCost = counters.geminiSearchCalls * GEMINI_PRICE_SEARCH;
  const geminiTotalCost  = geminiInputCost + geminiOutputCost + geminiSearchCost;

  const apolloEnrichCalls = byTool["apollo_enrich_organization"] ?? 0;
  const apolloPeopleCalls = byTool["apollo_people_search"]       ?? 0;
  const apolloCredits     = apolloEnrichCalls;
  const cseQueries        = byTool["web_search"]          ?? 0;
  const fetchUrlCalls     = byTool["fetch_url"]           ?? 0;
  const dnsLookups        = byTool["dns_lookup"]          ?? 0;
  const tlsChecks         = byTool["check_tls"]           ?? 0;
  const pageAnalyses      = byTool["analyze_page_source"] ?? 0;
  const renderPageCalls   = byTool["render_page"]         ?? 0;

  const sep = "═".repeat(72);
  console.log(`\n${sep}`);
  console.log(`  COST BREAKDOWN`);
  console.log(sep);
  console.log(`  LLM  (${MODEL} via Vertex AI)`);
  console.log(`    Input  : ${totalInputTokens.toLocaleString()} tokens  @ $${PRICE_INPUT_PER_M}/M  →  $${llmInputCost.toFixed(4)}`);
  console.log(`    Output : ${totalOutputTokens.toLocaleString()} tokens  @ $${PRICE_OUTPUT_PER_M}/M  →  $${llmOutputCost.toFixed(4)}`);
  console.log(`    Total  : $${llmTotalCost.toFixed(4)}`);
  console.log();
  if (counters.geminiSearchCalls > 0) {
    console.log(`  Gemini  (${GEMINI_MODEL} via Vertex AI)`);
    console.log(`    Input  : ${counters.geminiInputTokens.toLocaleString()} tokens  @ $${GEMINI_PRICE_INPUT_PER_M}/M  →  $${geminiInputCost.toFixed(4)}`);
    console.log(`    Output : ${counters.geminiOutputTokens.toLocaleString()} tokens  @ $${GEMINI_PRICE_OUTPUT_PER_M}/M  →  $${geminiOutputCost.toFixed(4)}`);
    console.log(`    Search : ${counters.geminiSearchCalls} call(s)  @ $${GEMINI_PRICE_SEARCH}/call  →  $${geminiSearchCost.toFixed(4)}`);
    console.log(`    Total  : $${geminiTotalCost.toFixed(4)}`);
    console.log();
  }
  console.log(`  Apollo`);
  console.log(`    organizations_enrich : ${apolloEnrichCalls} call(s)  =  ${apolloCredits} credit(s)`);
  console.log(`    people_api_search    : ${apolloPeopleCalls} call(s)  =  0 credits (free)`);
  console.log(`    Credits used         : ${apolloCredits}  ($/credit depends on your Apollo plan)`);
  console.log();
  console.log(`  Scanner  (all free)`);
  console.log(`    fetch_url        : ${fetchUrlCalls} call(s)`);
  console.log(`    dns_lookup       : ${dnsLookups} call(s)`);
  console.log(`    check_tls        : ${tlsChecks} call(s)`);
  console.log(`    analyze_page     : ${pageAnalyses} call(s)`);
  console.log(`    render_page      : ${renderPageCalls} call(s)`);
  console.log(`    web_search (CSE) : ${cseQueries} quer${cseQueries === 1 ? "y" : "ies"}  (free — 100/day limit)`);
  console.log();
  console.log(`  ${"─".repeat(50)}`);
  console.log(`  LLM total    : $${llmTotalCost.toFixed(4)}`);
  if (counters.geminiSearchCalls > 0)
    console.log(`  Gemini total : $${geminiTotalCost.toFixed(4)}`);
  console.log(`  Apollo       : ${apolloCredits} credit(s)`);
  console.log(`  Turns used   : ${turns}`);
  console.log(`${sep}\n`);

  const costData = {
    llm_input_tokens:    totalInputTokens,
    llm_output_tokens:   totalOutputTokens,
    llm_input_cost_usd:  parseFloat(llmInputCost.toFixed(4)),
    llm_output_cost_usd: parseFloat(llmOutputCost.toFixed(4)),
    llm_total_cost_usd:  parseFloat(llmTotalCost.toFixed(4)),
    apollo_credits_used: apolloCredits,
    cse_queries_used:    cseQueries,
    fetch_url_calls:     fetchUrlCalls,
    dns_lookups:         dnsLookups,
    tls_checks:          tlsChecks,
    page_analyses:       pageAnalyses,
    render_page_calls:   renderPageCalls,
  };

  return {
    company_name:     company.name,
    domain:           company.domain,
    generated_at:     new Date().toISOString(),
    model:            MODEL,
    turns_used:       turns,
    profile:          finalJson,
    _cost:            costData,
    _tool_calls:      toolLog,
    _resolution_log:  logger.getMissingFromApollo(),
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log(`\n${"═".repeat(72)}`);
  console.log(`  DSALTA AI Agent — Prompt 5 (Apollo pre-seeded)`);
  console.log(`  Model: ${MODEL} via Vertex AI  |  Search: Google Custom Search API`);
  console.log(`${"═".repeat(72)}`);

  const allResults: any[] = [];

  for (const company of COMPANIES) {
    const companyStart = Date.now();
    const result = await runAgent(company);
    const companySecs = ((Date.now() - companyStart) / 1000).toFixed(1);
    console.log(`  ⏱ ${company.name}: ${companySecs}s`);
    allResults.push(result);
  }

  const outPath = join(__dirname, "dsalta_agent_output.json");
  writeFileSync(outPath, JSON.stringify(allResults, null, 2), "utf-8");

  const totalSecs = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${"═".repeat(72)}`);
  console.log(`  Output → ${outPath}`);
  console.log(`  Total time: ${totalSecs}s`);
  console.log(`${"═".repeat(72)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
