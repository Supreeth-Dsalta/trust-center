BEGIN;

DO $seed$
DECLARE
  v_company_id BIGINT;
  v_run_id BIGINT;
BEGIN
  SELECT id
  INTO v_company_id
  FROM companies
  WHERE slug = 'mintlify';

  IF v_company_id IS NOT NULL THEN
    UPDATE companies
    SET active_run_id = NULL
    WHERE id = v_company_id;

    DELETE FROM source_records WHERE company_id = v_company_id;
    DELETE FROM company_pages WHERE company_id = v_company_id;
    DELETE FROM company_assessment_findings WHERE company_id = v_company_id;
    DELETE FROM company_integrations WHERE company_id = v_company_id;
    DELETE FROM company_technical_checks WHERE company_id = v_company_id;
    DELETE FROM company_incidents WHERE company_id = v_company_id;
    DELETE FROM company_data_handling_items WHERE company_id = v_company_id;
    DELETE FROM company_subprocessors WHERE company_id = v_company_id;
    DELETE FROM company_policies WHERE company_id = v_company_id;
    DELETE FROM company_compliance_items WHERE company_id = v_company_id;
    DELETE FROM company_documents WHERE company_id = v_company_id;
    DELETE FROM company_contacts WHERE company_id = v_company_id;
    DELETE FROM company_customers WHERE company_id = v_company_id;
    DELETE FROM company_people WHERE company_id = v_company_id;
    DELETE FROM company_social_links WHERE company_id = v_company_id;
    DELETE FROM company_domains WHERE company_id = v_company_id;
    DELETE FROM agent_runs WHERE company_id = v_company_id;
    DELETE FROM companies WHERE id = v_company_id;
  END IF;

  INSERT INTO companies (
    slug,
    display_name,
    legal_name,
    primary_domain,
    logo_url,
    industry,
    description_short,
    description_long,
    founded_year,
    hq_city,
    hq_state,
    hq_country,
    employee_count,
    total_funding,
    total_funding_printed,
    top_investors,
    company_state,
    publishing_decision,
    data_richness_score,
    scan_date,
    last_generated_at,
    apollo_data_json,
    raw_profile_json
  )
  VALUES (
    'mintlify',
    'Mintlify',
    'Mintlify, Inc.',
    'mintlify.com',
    'https://zenprospect-production.s3.amazonaws.com/uploads/pictures/69b28c21d880dc00015fedb8/picture',
    'Software Development',
    'AI-native documentation platform powering intelligent knowledge infrastructure for developers and enterprises.',
    'Mintlify is an AI-native documentation platform founded in 2022 and based in San Francisco, California. The company helps engineering teams create, manage, and deploy high-quality developer documentation with AI-powered search, guides, API references, and knowledge infrastructure.',
    2022,
    'San Francisco',
    'California',
    'United States',
    67,
    21300000,
    '$21.3M',
    'Andreessen Horowitz, Y Combinator',
    'unclaimed',
    'publish',
    9,
    '2025-07-11T12:00:00Z'::timestamptz,
    '2026-03-23T17:06:39.599Z'::timestamptz,
    $apollo$
    {
      "company_name": "Mintlify",
      "domain": "mintlify.com",
      "industry": "Software Development",
      "founded_year": 2022,
      "hq_city": "San Francisco",
      "hq_state": "California",
      "hq_country": "United States",
      "employee_count": 67,
      "total_funding": 21300000,
      "total_funding_printed": "21.3M",
      "top_investors": "Andreessen Horowitz, Y Combinator",
      "logo_url": "https://zenprospect-production.s3.amazonaws.com/uploads/pictures/69b28c21d880dc00015fedb8/picture"
    }
    $apollo$::jsonb,
    $raw$
    {
      "company_name": "Mintlify",
      "domain": "mintlify.com",
      "generated_at": "2026-03-23T17:06:39.599Z",
      "model": "claude-opus-4-6",
      "turns_used": 7
    }
    $raw$::jsonb
  )
  RETURNING id INTO v_company_id;

  INSERT INTO company_domains (
    company_id,
    domain,
    domain_type,
    is_primary,
    is_active
  )
  VALUES
    (v_company_id, 'mintlify.com', 'primary', TRUE, TRUE),
    (v_company_id, 'security.mintlify.com', 'trust_center', FALSE, TRUE),
    (v_company_id, 'status.mintlify.com', 'status_page', FALSE, TRUE)
  ON CONFLICT (company_id, domain) DO NOTHING;

  INSERT INTO agent_runs (
    company_id,
    run_type,
    status,
    prompt_version,
    model_name,
    started_at,
    finished_at,
    turns_used,
    cost_json,
    input_json,
    output_json
  )
  VALUES (
    v_company_id,
    'full_scan',
    'completed',
    'manual-import',
    'claude-opus-4-6',
    '2026-03-23T17:00:43.176Z'::timestamptz,
    '2026-03-23T17:06:39.599Z'::timestamptz,
    7,
    $cost$
    {
      "llm_input_tokens": 183984,
      "llm_output_tokens": 25756,
      "llm_total_cost_usd": 4.6915,
      "apollo_credits_used": 1,
      "fetch_url_calls": 27,
      "dns_lookups": 1,
      "tls_checks": 1
    }
    $cost$::jsonb,
    '{}'::jsonb,
    $out$
    {
      "company_name": "Mintlify",
      "domain": "mintlify.com",
      "generated_at": "2026-03-23T17:06:39.599Z"
    }
    $out$::jsonb
  )
  RETURNING id INTO v_run_id;

  UPDATE companies
  SET active_run_id = v_run_id
  WHERE id = v_company_id;

  INSERT INTO company_social_links (
    company_id,
    platform,
    url,
    is_verified,
    verification_method,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'website', 'https://mintlify.com', TRUE, 'agent_json', 'https://mintlify.com', 'manual seed', 1),
    (v_company_id, 'linkedin', 'http://www.linkedin.com/company/mintlify', TRUE, 'agent_json', 'http://www.linkedin.com/company/mintlify', 'manual seed', 2),
    (v_company_id, 'twitter', 'https://twitter.com/mintlify', TRUE, 'agent_json', 'https://twitter.com/mintlify', 'manual seed', 3),
    (v_company_id, 'github', 'https://github.com/mintlify', TRUE, 'agent_json', 'https://github.com/mintlify', 'manual seed', 4),
    (v_company_id, 'youtube', 'https://youtube.com/@mintlify', TRUE, 'agent_json', 'https://youtube.com/@mintlify', 'manual seed', 5),
    (v_company_id, 'crunchbase', 'https://www.crunchbase.com/organization/mintlify', TRUE, 'agent_json', 'https://www.crunchbase.com/organization/mintlify', 'manual seed', 6),
    (v_company_id, 'blog', 'https://mintlify.com/blog', TRUE, 'agent_json', 'https://mintlify.com/blog', 'manual seed', 7),
    (v_company_id, 'status_page', 'https://status.mintlify.com', TRUE, 'agent_json', 'https://status.mintlify.com', 'manual seed', 8)
  ON CONFLICT (company_id, platform) DO UPDATE
  SET
    url = EXCLUDED.url,
    is_verified = EXCLUDED.is_verified,
    verification_method = EXCLUDED.verification_method,
    source_url = EXCLUDED.source_url,
    source_label = EXCLUDED.source_label,
    sort_order = EXCLUDED.sort_order;

  INSERT INTO company_people (
    company_id,
    person_group,
    full_name,
    first_name,
    last_name,
    title,
    bio,
    background_text,
    initials,
    sort_order,
    confidence_level,
    source_url,
    source_label,
    raw_json
  )
  VALUES
    (
      v_company_id,
      'founders',
      'Han Wang',
      'Han',
      'Wang',
      'Co-Founder',
      'Co-Founder of Mintlify.',
      'Not publicly confirmed on company website.',
      'HW',
      1,
      'DETECTED',
      NULL,
      'Apollo people search',
      '{"source":"apollo_search"}'::jsonb
    ),
    (
      v_company_id,
      'founders',
      'Hahnbee Lee',
      'Hahnbee',
      'Lee',
      'Co-Founder',
      'Co-Founder of Mintlify.',
      'Not publicly confirmed on company website.',
      'HL',
      2,
      'DETECTED',
      NULL,
      'Apollo people search',
      '{"source":"apollo_search"}'::jsonb
    );

  INSERT INTO company_customers (
    company_id,
    customer_name,
    display_name,
    confidence_level,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'Anthropic', 'Anthropic', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 1),
    (v_company_id, 'Coinbase', 'Coinbase', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 2),
    (v_company_id, 'HubSpot', 'HubSpot', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 3),
    (v_company_id, 'Zapier', 'Zapier', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 4),
    (v_company_id, 'AT&T', 'AT&T', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 5),
    (v_company_id, 'Fidelity', 'Fidelity', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 6),
    (v_company_id, 'PayPal', 'PayPal', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 7),
    (v_company_id, 'Perplexity', 'Perplexity', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 8),
    (v_company_id, 'Laravel', 'Laravel', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 9),
    (v_company_id, 'Replit', 'Replit', 'VERIFIED', 'https://mintlify.com/customers', 'manual seed', 10)
  ON CONFLICT (company_id, customer_name) DO NOTHING;

  INSERT INTO company_contacts (
    company_id,
    contact_type,
    label,
    email,
    url,
    is_public,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'security', 'Security', 'security@mintlify.com', NULL, TRUE, 'https://mintlify.com/security/responsible-disclosure', 'manual seed', 1),
    (v_company_id, 'general', 'General', 'hi@mintlify.com', NULL, TRUE, 'https://mintlify.com/legal/privacy', 'manual seed', 2),
    (v_company_id, 'sales', 'Enterprise Demo', NULL, 'https://mintlify.com/enterprise', TRUE, 'https://mintlify.com/enterprise', 'manual seed', 3);

  INSERT INTO company_documents (
    company_id,
    document_name,
    document_type,
    category,
    is_public,
    is_requestable,
    public_url,
    request_cta_label,
    status_text,
    description_text,
    confidence_level,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'SOC 2 Report', 'soc2_report', 'security', FALSE, TRUE, 'https://security.mintlify.com', 'Request', 'Request via trust center', 'SOC 2 report access may be available through the trust center.', 'STATED', 'https://security.mintlify.com', 'manual seed', 1),
    (v_company_id, 'Data Processing Agreement (DPA)', 'dpa', 'legal', FALSE, TRUE, NULL, 'Request', 'Not publicly available', 'No public DPA found.', 'NOT FOUND', NULL, 'manual seed', 2),
    (v_company_id, 'Service Level Agreement (SLA)', 'sla', 'legal', FALSE, TRUE, NULL, 'Request', 'Enterprise only', 'Available for Enterprise customers by request.', 'STATED', 'https://mintlify.com/pricing', 'manual seed', 3),
    (v_company_id, 'Penetration Test Report', 'pen_test_report', 'security', FALSE, TRUE, NULL, 'Request', 'Not publicly available', 'No public penetration test report found.', 'NOT FOUND', NULL, 'manual seed', 4),
    (v_company_id, 'Privacy Policy', 'privacy_policy', 'legal', TRUE, FALSE, 'https://mintlify.com/legal/privacy', NULL, 'Public', 'Mintlify privacy policy.', 'VERIFIED', 'https://mintlify.com/legal/privacy', 'manual seed', 5),
    (v_company_id, 'Terms of Service', 'terms_of_service', 'legal', TRUE, FALSE, 'https://mintlify.com/legal/terms', NULL, 'Public', 'Mintlify terms of service.', 'VERIFIED', 'https://mintlify.com/legal/terms', 'manual seed', 6),
    (v_company_id, 'Third-Party Provider Terms', 'subprocessor_terms', 'legal', TRUE, FALSE, 'https://mintlify.com/legal/third-party-provider-terms', NULL, 'Public', 'Subprocessors and AI provider terms.', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 7),
    (v_company_id, 'Responsible Disclosure Policy', 'responsible_disclosure', 'security', TRUE, FALSE, 'https://mintlify.com/security/responsible-disclosure', NULL, 'Public', 'Vulnerability disclosure policy.', 'VERIFIED', 'https://mintlify.com/security/responsible-disclosure', 'manual seed', 8),
    (v_company_id, 'Status Page', 'status_page', 'security', TRUE, FALSE, 'https://status.mintlify.com', NULL, 'Public', 'Operational status page.', 'VERIFIED', 'https://status.mintlify.com', 'manual seed', 9);

  INSERT INTO company_compliance_items (
    company_id,
    framework_name,
    badge_label,
    status,
    confidence_level,
    report_type,
    last_audited_year,
    valid_until,
    statement_text,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (
      v_company_id,
      'SOC 2',
      'SOC 2',
      'stated',
      'STATED',
      NULL,
      NULL,
      NULL,
      'Mintlify operates a Drata-powered trust center. Specific report type was not publicly confirmed.',
      'https://security.mintlify.com',
      'manual seed',
      1
    ),
    (
      v_company_id,
      'GDPR',
      'GDPR',
      'stated',
      'STATED',
      NULL,
      NULL,
      NULL,
      'Privacy policy references EU/EEA data subject rights.',
      'https://mintlify.com/legal/privacy',
      'manual seed',
      2
    ),
    (
      v_company_id,
      'ISO 27001',
      'ISO 27001',
      'not_found',
      'NOT FOUND',
      NULL,
      NULL,
      NULL,
      'No public ISO 27001 statement found.',
      'https://mintlify.com/enterprise',
      'manual seed',
      3
    ),
    (
      v_company_id,
      'HIPAA',
      'HIPAA',
      'not_found',
      'NOT FOUND',
      NULL,
      NULL,
      NULL,
      'No public HIPAA statement found.',
      'https://mintlify.com/legal/terms',
      'manual seed',
      4
    );

  INSERT INTO company_policies (
    company_id,
    policy_name,
    policy_type,
    exists_publicly,
    public_url,
    last_updated_text,
    summary_text,
    status_text,
    confidence_level,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'Privacy Policy', 'privacy', TRUE, 'https://mintlify.com/legal/privacy', 'January 16, 2026', 'Covers data collection, processing, sharing, and retention practices.', 'published', 'VERIFIED', 'https://mintlify.com/legal/privacy', 'manual seed', 1),
    (v_company_id, 'Terms of Service', 'terms', TRUE, 'https://mintlify.com/legal/terms', 'October 8, 2025', 'Governs platform usage, accounts, support, licensing, and data terms.', 'published', 'VERIFIED', 'https://mintlify.com/legal/terms', 'manual seed', 2),
    (v_company_id, 'Third-Party Provider Terms', 'third_party_provider_terms', TRUE, 'https://mintlify.com/legal/third-party-provider-terms', 'January 16, 2026', 'Lists subprocessors and AI providers.', 'published', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 3),
    (v_company_id, 'Responsible Disclosure Policy', 'responsible_disclosure', TRUE, 'https://mintlify.com/security/responsible-disclosure', 'January 16, 2026', 'Defines vulnerability reporting process and scope.', 'published', 'VERIFIED', 'https://mintlify.com/security/responsible-disclosure', 'manual seed', 4),
    (v_company_id, 'Data Processing Agreement (DPA)', 'dpa', FALSE, NULL, NULL, 'No public DPA found.', 'not_found', 'NOT FOUND', NULL, 'manual seed', 5),
    (v_company_id, 'Service Level Agreement (SLA)', 'sla', FALSE, NULL, NULL, 'No standalone public SLA document found.', 'not_found', 'NOT FOUND', NULL, 'manual seed', 6),
    (v_company_id, 'Cookie Policy', 'cookie_policy', FALSE, NULL, NULL, 'No dedicated cookie policy found.', 'not_found', 'NOT FOUND', NULL, 'manual seed', 7);

  INSERT INTO company_subprocessors (
    company_id,
    vendor_name,
    purpose,
    location_text,
    vendor_category,
    status_text,
    confidence_level,
    detection_method,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'Helicone', 'LLM middleware provider — analysis and cost tracking', 'Not specified', 'ai', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 1),
    (v_company_id, 'OpenRouter', 'LLM middleware provider — failover during provider outages', 'Not specified', 'ai', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 2),
    (v_company_id, 'Amazon Web Services (AWS)', 'Cloud infrastructure — data storage and hosting', 'Not specified', 'cloud', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 3),
    (v_company_id, 'CamelAI', 'Internal analytics dashboarding — anonymous visitor data', 'Not specified', 'analytics', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 4),
    (v_company_id, 'Clay', 'Customer enrichment — contact details for growth purposes', 'Not specified', 'sales', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 5),
    (v_company_id, 'ClickHouse Cloud', 'Cloud infrastructure — data storage and hosting', 'Not specified', 'cloud', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 6),
    (v_company_id, 'Datadog', 'Logging and monitoring — network request logs and IP addresses', 'Not specified', 'monitoring', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 7),
    (v_company_id, 'MongoDB Atlas', 'Cloud infrastructure — data storage and hosting', 'Not specified', 'cloud', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 8),
    (v_company_id, 'Plain', 'Help center — customer support cases and emails', 'Not specified', 'support', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 9),
    (v_company_id, 'PostHog', 'Dashboard analytics — anonymized analytics and sanitized session replays', 'Not specified', 'analytics', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 10),
    (v_company_id, 'Stripe', 'Payment processing — subscriptions and purchases', 'Not specified', 'payments', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 11),
    (v_company_id, 'Stytch', 'Authentication — signup/login flows and user email storage', 'Not specified', 'auth', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 12),
    (v_company_id, 'Vercel', 'Cloud infrastructure — hosting deployments and serving applications', 'Not specified', 'hosting', 'active', 'VERIFIED', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 13)
  ON CONFLICT (company_id, vendor_name) DO NOTHING;

  INSERT INTO company_data_handling_items (
    company_id,
    group_name,
    item_key,
    title,
    detail_text,
    status,
    confidence_level,
    action_label,
    action_url,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'confirmed', 'no_sensitive_data', 'No sensitive personal information', 'Mintlify states it does not process sensitive personal information.', 'confirmed', 'VERIFIED', NULL, NULL, 'https://mintlify.com/legal/privacy', 'manual seed', 1),
    (v_company_id, 'confirmed', 'no_third_party_personal_data', 'No third-party personal information intake', 'Mintlify states it does not receive personal information from third parties.', 'confirmed', 'VERIFIED', NULL, NULL, 'https://mintlify.com/legal/privacy', 'manual seed', 2),
    (v_company_id, 'confirmed', 'service_processing', 'Service delivery and improvement', 'Personal information is processed to provide, improve, and administer services, communicate with users, and for security and fraud prevention.', 'confirmed', 'VERIFIED', NULL, NULL, 'https://mintlify.com/legal/privacy', 'manual seed', 3),
    (v_company_id, 'confirmed', 'posthog', 'PostHog analytics', 'PostHog collects anonymized analytics and sanitized session replays.', 'confirmed', 'VERIFIED', NULL, NULL, 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 4),
    (v_company_id, 'confirmed', 'stytch', 'Stytch email storage', 'Stytch stores user emails as part of Mintlify authentication flow.', 'confirmed', 'VERIFIED', NULL, NULL, 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 5),
    (v_company_id, 'not_confirmed', 'retention_periods', 'Retention periods', 'Data retention periods are not specified in the public privacy policy.', 'not_found', 'NOT FOUND', NULL, NULL, 'https://mintlify.com/legal/privacy', 'manual seed', 6),
    (v_company_id, 'not_confirmed', 'ai_training', 'AI model training usage', 'No explicit public statement found on whether customer documentation is used for AI model training.', 'not_found', 'NOT FOUND', NULL, NULL, 'https://mintlify.com/legal/privacy', 'manual seed', 7),
    (v_company_id, 'not_confirmed', 'encryption_detail', 'Detailed encryption methods', 'Specific encryption methods beyond TLS were not described publicly.', 'not_found', 'NOT FOUND', NULL, NULL, 'https://security.mintlify.com', 'manual seed', 8)
  ON CONFLICT (company_id, item_key) DO NOTHING;

  INSERT INTO company_technical_checks (
    company_id,
    run_id,
    check_group,
    check_category,
    check_key,
    title,
    description_text,
    status,
    severity,
    confidence_level,
    value_text,
    value_json,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, v_run_id, 'headers', 'http_headers', 'strict_transport_security', 'Strict-Transport-Security', 'HSTS present with max-age=63072000.', 'present', 'pass', 'DETECTED', 'present — max-age=63072000', '{"header":"strict_transport_security","value":"present — max-age=63072000"}'::jsonb, 'https://mintlify.com', 'manual seed', 1),
    (v_company_id, v_run_id, 'headers', 'http_headers', 'content_security_policy', 'Content-Security-Policy', 'No CSP header detected.', 'absent', 'medium', 'DETECTED', 'absent', '{"header":"content_security_policy","value":"absent"}'::jsonb, 'https://mintlify.com', 'manual seed', 2),
    (v_company_id, v_run_id, 'headers', 'http_headers', 'x_frame_options', 'X-Frame-Options', 'Header set to DENY.', 'present', 'pass', 'DETECTED', 'DENY', '{"header":"x_frame_options","value":"DENY"}'::jsonb, 'https://mintlify.com', 'manual seed', 3),
    (v_company_id, v_run_id, 'headers', 'http_headers', 'x_content_type_options', 'X-Content-Type-Options', 'No X-Content-Type-Options header detected.', 'absent', 'low', 'DETECTED', 'absent', '{"header":"x_content_type_options","value":"absent"}'::jsonb, 'https://mintlify.com', 'manual seed', 4),
    (v_company_id, v_run_id, 'headers', 'http_headers', 'permissions_policy', 'Permissions-Policy', 'No Permissions-Policy header detected.', 'absent', 'low', 'DETECTED', 'absent', '{"header":"permissions_policy","value":"absent"}'::jsonb, 'https://mintlify.com', 'manual seed', 5),
    (v_company_id, v_run_id, 'tls', 'tls', 'tls_versions', 'TLS Versions', 'Mintlify supports TLS 1.2 and TLS 1.3.', 'present', 'pass', 'DETECTED', 'TLS 1.2, TLS 1.3', '{"versions":["TLS 1.2","TLS 1.3"],"cert_valid":true,"cert_expiry":"2025-10-06","issuer":"Google Trust Services"}'::jsonb, 'https://mintlify.com', 'manual seed', 6),
    (v_company_id, v_run_id, 'dns', 'email_security', 'spf', 'SPF', 'SPF record present.', 'present', 'pass', 'DETECTED', 'present — v=spf1 include:_spf.google.com include:sendgrid.net include:stytch.com -all', '{"record":"v=spf1 include:_spf.google.com include:sendgrid.net include:stytch.com -all"}'::jsonb, 'mintlify.com', 'manual seed', 7),
    (v_company_id, v_run_id, 'dns', 'email_security', 'dkim', 'DKIM', 'DKIM present.', 'present', 'pass', 'DETECTED', 'present', '{"present":true}'::jsonb, 'mintlify.com', 'manual seed', 8),
    (v_company_id, v_run_id, 'dns', 'email_security', 'dmarc', 'DMARC', 'DMARC present with reject policy.', 'present', 'pass', 'DETECTED', 'present — reject policy', '{"present":true,"policy":"reject","record":"v=DMARC1; p=reject; rua=mailto:dmarc@mintlify.com"}'::jsonb, 'mintlify.com', 'manual seed', 9),
    (v_company_id, v_run_id, 'cookies', 'cookies', 'pre_consent_cookie', 'Cookies Before Consent', 'One cookie detected before consent; no consent mechanism detected.', 'present', 'low', 'DETECTED', '1 cookie before consent', '{"count_before_consent":1,"consent_mechanism":"none detected"}'::jsonb, 'https://mintlify.com', 'manual seed', 10),
    (v_company_id, v_run_id, 'protocol', 'http2', 'http2', 'HTTP/2', 'HTTP/2 supported.', 'present', 'pass', 'DETECTED', 'true', '{"http2":true}'::jsonb, 'https://mintlify.com', 'manual seed', 11)
  ON CONFLICT (company_id, check_group, check_key) DO NOTHING;

  INSERT INTO company_integrations (
    company_id,
    section_group,
    category,
    name,
    description_text,
    status_text,
    confidence_level,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'Frontend & Frameworks', 'framework', 'Next.js', 'Web framework detected via Apollo and X-Powered-By header.', 'detected', 'DETECTED', 'https://mintlify.com', 'manual seed', 1),
    (v_company_id, 'Frontend & Frameworks', 'frontend', 'React', 'Frontend library listed in Apollo.', 'detected', 'DETECTED', 'https://mintlify.com', 'manual seed', 2),
    (v_company_id, 'Cloud Infrastructure & Hosting', 'hosting', 'Vercel', 'Hosting provider detected via server header and terms.', 'detected', 'DETECTED', 'https://mintlify.com', 'manual seed', 3),
    (v_company_id, 'Cloud Infrastructure & Hosting', 'cloud', 'AWS', 'Cloud infrastructure provider disclosed in third-party terms.', 'verified', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 4),
    (v_company_id, 'AI & Machine Learning', 'llm', 'Anthropic', 'AI provider disclosed in third-party terms.', 'verified', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 5),
    (v_company_id, 'AI & Machine Learning', 'llm', 'OpenAI', 'AI provider disclosed in third-party terms.', 'verified', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 6),
    (v_company_id, 'AI & Machine Learning', 'llm', 'Google', 'AI provider disclosed in third-party terms.', 'verified', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 7),
    (v_company_id, 'Analytics & Monitoring', 'analytics', 'Google Tag Manager', 'GTM script detected.', 'detected', 'DETECTED', 'https://mintlify.com', 'manual seed', 8),
    (v_company_id, 'Analytics & Monitoring', 'analytics', 'PostHog', 'PostHog detected in page source and third-party terms.', 'verified', 'VERIFIED', 'https://mintlify.com', 'manual seed', 9),
    (v_company_id, 'Authentication & Payments', 'auth', 'Stytch', 'Authentication provider.', 'verified', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 10),
    (v_company_id, 'Authentication & Payments', 'payments', 'Stripe', 'Payment processor.', 'verified', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 11),
    (v_company_id, 'Communication & Collaboration', 'git', 'GitHub', 'GitHub organization present.', 'detected', 'DETECTED', 'https://github.com/mintlify', 'manual seed', 12);

  INSERT INTO company_assessment_findings (
    company_id,
    finding_group,
    title,
    summary_text,
    risk_level,
    severity,
    confidence_level,
    source_url,
    source_label,
    sort_order
  )
  VALUES
    (v_company_id, 'Email Security', 'Strong email authentication posture', 'Mintlify has SPF, DKIM, and DMARC with reject policy.', 'low', 'low', 'DETECTED', 'mintlify.com', 'manual seed', 1),
    (v_company_id, 'Transport Encryption', 'Strong TLS and HSTS posture', 'TLS 1.2/1.3 supported, certificate valid, HSTS enforced.', 'low', 'low', 'DETECTED', 'https://mintlify.com', 'manual seed', 2),
    (v_company_id, 'HTTP Security Headers', 'Missing browser-side hardening headers', 'CSP, X-Content-Type-Options, and Permissions-Policy are absent.', 'medium', 'medium', 'DETECTED', 'https://mintlify.com', 'manual seed', 3),
    (v_company_id, 'Vulnerability Disclosure', 'Published disclosure program', 'Mintlify maintains a responsible disclosure process and dedicated security email.', 'low', 'low', 'VERIFIED', 'https://mintlify.com/security/responsible-disclosure', 'manual seed', 4),
    (v_company_id, 'Vendor Transparency', 'High subprocessor transparency', 'Mintlify publishes 13 subprocessors and 3 AI providers.', 'low', 'low', 'VERIFIED', 'https://mintlify.com/legal/third-party-provider-terms', 'manual seed', 5),
    (v_company_id, 'Cookie Consent', 'Cookie set before consent', 'One PostHog cookie was set before user consent and no banner was detected.', 'medium', 'medium', 'DETECTED', 'https://mintlify.com', 'manual seed', 6);

  INSERT INTO source_records (
    company_id,
    run_id,
    source_type,
    source_key,
    url,
    query_text,
    title,
    status_code,
    content_excerpt,
    raw_json,
    fetched_at
  )
  VALUES
    (v_company_id, v_run_id, 'page_crawl', 'homepage', 'https://mintlify.com', NULL, 'Mintlify - The Intelligent Knowledge Platform', 200, 'Build the knowledge infrastructure that keeps AI agents accurate.', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'trust_center', 'https://security.mintlify.com', NULL, 'Trust Center | Powered by Drata', 200, 'Trust Center | Powered by Drata', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'privacy', 'https://mintlify.com/legal/privacy', NULL, 'Privacy Policy', 200, 'Privacy Policy — Last updated on January 16, 2026', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'terms', 'https://mintlify.com/legal/terms', NULL, 'Terms of Service', 200, 'Terms of Service — Last updated on October 8, 2025', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'responsible_disclosure', 'https://mintlify.com/security/responsible-disclosure', NULL, 'Responsible Disclosure', 200, 'Responsible Disclosure — Report vulnerabilities to security@mintlify.com', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'third_party_provider_terms', 'https://mintlify.com/legal/third-party-provider-terms', NULL, 'Third-Party Provider Terms', 200, 'Subprocessor list with 13 subprocessors and AI providers', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'enterprise', 'https://mintlify.com/enterprise', NULL, 'Enterprise - Mintlify', 200, 'Enterprise - Intelligence to level up enterprise knowledge', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'pricing', 'https://mintlify.com/pricing', NULL, 'Pricing - Mintlify', 200, 'Pricing — Hobby, Pro ($250/mo), Enterprise (custom)', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'customers', 'https://mintlify.com/customers', NULL, 'Customers - Mintlify', 200, 'Customer stories from Anthropic, Coinbase, PayPal, Fidelity, and others', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'status', 'https://status.mintlify.com', NULL, 'mintlify Status', 200, 'Fully operational — Documentation 99.86% uptime, Updates 100%, Dashboard 99.98%', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'blog', 'https://mintlify.com/blog', NULL, 'Mintlify Blog', 200, 'Mintlify blog', '{}'::jsonb, NOW()),
    (v_company_id, v_run_id, 'page_crawl', 'github', 'https://github.com/mintlify', NULL, 'Mintlify GitHub', 200, 'Mintlify GitHub organization', '{}'::jsonb, NOW());

  INSERT INTO company_pages (
    company_id,
    run_id,
    page_key,
    route_slug,
    title,
    description,
    included,
    sort_order,
    sections_json,
    faqs_json,
    sources_cited_json,
    disclaimer_text,
    prev_route_slug,
    next_route_slug
  )
  VALUES
    (
      v_company_id,
      v_run_id,
      'overview',
      'overview',
      'Mintlify Company Overview',
      'An AI-native documentation platform powering intelligent knowledge infrastructure for developers and enterprises.',
      TRUE,
      10,
      $p$
      [
        {
          "type": "hero",
          "content": "Mintlify is an AI-native documentation platform that helps engineering teams build, maintain, and deliver intelligent knowledge infrastructure. Founded in 2022 in San Francisco, the company serves over 10,000 organizations — including Anthropic, Coinbase, PayPal, Fidelity, and HubSpot — reaching 50 million developers annually."
        },
        {
          "type": "company_profile_grid",
          "fields": {
            "company": {"value": "Mintlify"},
            "legal_name": {"value": "Mintlify, Inc."},
            "founded": {"value": "2022"},
            "location": {"value": "San Francisco, California, United States"},
            "employees": {"value": "67"},
            "funding": {"value": "$21.3M"},
            "investors": {"value": "Andreessen Horowitz, Y Combinator"},
            "customers": {"value": "Anthropic, Coinbase, PayPal, Fidelity, HubSpot, Zapier, AT&T, Perplexity"}
          }
        },
        {
          "type": "badge_row",
          "badges": [
            {
              "name": "SOC 2",
              "confidence": "STATED",
              "year": "STATED",
              "info_text": "Mintlify operates a Drata-powered trust center, which strongly suggests active SOC 2 work, though report type was not publicly confirmed."
            },
            {
              "name": "GDPR",
              "confidence": "STATED",
              "year": "STATED",
              "info_text": "Mintlify privacy policy references EU/EEA data subject rights and privacy requests."
            },
            {
              "name": "Responsible Disclosure",
              "confidence": "VERIFIED",
              "year": "VERIFIED",
              "info_text": "Mintlify publishes a responsible disclosure policy with scope and a security contact."
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "What does Mintlify do?",
          "answer": "Mintlify provides an AI-native documentation platform that enables companies to build, manage, and deliver developer-facing knowledge bases, API references, and interactive guides.",
          "confidence": "VERIFIED"
        },
        {
          "question": "Who are Mintlify's notable customers?",
          "answer": "Published customers include Anthropic, Coinbase, PayPal, Fidelity, HubSpot, Zapier, AT&T, Perplexity, X, Laravel, Replit, Lovable, Glean, Pinecone, and others.",
          "confidence": "VERIFIED"
        },
        {
          "question": "How much funding has Mintlify raised?",
          "answer": "Mintlify has raised $21.3 million in total funding from Andreessen Horowitz and Y Combinator.",
          "confidence": "DETECTED"
        }
      ]
      $f$::jsonb,
      '["Apollo company enrichment","Apollo people search","mintlify.com","mintlify.com/customers","mintlify.com/enterprise","mintlify.com/legal/privacy"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      NULL,
      'security-overview'
    ),
    (
      v_company_id,
      v_run_id,
      'security',
      'security-overview',
      'Mintlify Security Overview',
      'Technical security posture and controls observed for Mintlify.',
      TRUE,
      20,
      $p$
      [
        {
          "type": "posture_card",
          "card": "Encryption",
          "content": "Mintlify supports TLS 1.2 and TLS 1.3 with a valid certificate and HSTS enabled for approximately two years.",
          "confidence": "DETECTED",
          "source": "TLS scanner, HTTP headers"
        },
        {
          "type": "posture_card",
          "card": "Infrastructure",
          "content": "Mintlify runs on Vercel with AWS-backed infrastructure components including EKS and ECS. ClickHouse Cloud and MongoDB Atlas are disclosed as data infrastructure providers.",
          "confidence": "DETECTED",
          "source": "HTTP headers, third-party provider terms"
        },
        {
          "type": "posture_card",
          "card": "Access Controls",
          "content": "Mintlify uses Stytch for authentication and offers SSO on Enterprise plans. Role-based access and permissions are available on higher tiers.",
          "confidence": "STATED",
          "source": "Pricing, third-party provider terms"
        },
        {
          "type": "posture_card",
          "card": "Privacy",
          "content": "Mintlify publishes a privacy policy covering data subject rights, privacy requests, and provider usage. AI providers include Anthropic, OpenAI, and Google.",
          "confidence": "VERIFIED",
          "source": "mintlify.com/legal/privacy"
        },
        {
          "type": "note",
          "content": "Mintlify also operates a Drata-powered trust center at security.mintlify.com."
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Does Mintlify have a trust center?",
          "answer": "Yes. Mintlify operates a Drata-powered trust center at security.mintlify.com.",
          "confidence": "VERIFIED"
        },
        {
          "question": "What authentication provider does Mintlify use?",
          "answer": "Mintlify uses Stytch as its authentication provider.",
          "confidence": "VERIFIED"
        }
      ]
      $f$::jsonb,
      '["TLS scanner","HTTP header scan","DNS scan","mintlify.com/legal/privacy","mintlify.com/legal/third-party-provider-terms","security.mintlify.com"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'overview',
      'leadership-and-people'
    ),
    (
      v_company_id,
      v_run_id,
      'leadership',
      'leadership-and-people',
      'Mintlify Leadership & People',
      'Key leadership at Mintlify.',
      TRUE,
      30,
      $p$
      [
        {
          "type": "founder_cards",
          "leaders": [
            {
              "name": "Han Wang",
              "title": "Co-Founder",
              "background": "Not publicly confirmed on Mintlify website."
            },
            {
              "name": "Hahnbee Lee",
              "title": "Co-Founder",
              "background": "Not publicly confirmed on Mintlify website."
            }
          ]
        },
        {
          "type": "confirmed_items",
          "heading": "Company Signals",
          "items": [
            {
              "title": "Founder-Led",
              "detail": "Mintlify is led by its co-founders Han Wang and Hahnbee Lee.",
              "confidence": "DETECTED"
            },
            {
              "title": "Venture-Backed",
              "detail": "Mintlify has raised $21.3M from Andreessen Horowitz and Y Combinator.",
              "confidence": "DETECTED"
            },
            {
              "title": "Team Size",
              "detail": "Mintlify currently has 67 employees according to enrichment data.",
              "confidence": "DETECTED"
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Who founded Mintlify?",
          "answer": "Mintlify was co-founded by Han Wang and Hahnbee Lee.",
          "confidence": "DETECTED"
        }
      ]
      $f$::jsonb,
      '["Apollo people search","Apollo company enrichment"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'security-overview',
      'compliance-status'
    ),
    (
      v_company_id,
      v_run_id,
      'compliance',
      'compliance-status',
      'Mintlify Compliance Status',
      'Current compliance posture for Mintlify based on publicly available certifications and statements.',
      TRUE,
      40,
      $p$
      [
        {
          "type": "badge_row",
          "badges": [
            {
              "name": "SOC 2",
              "confidence": "STATED",
              "year": "STATED",
              "info_text": "Mintlify operates a Drata-powered trust center, but the specific SOC 2 report type was not publicly confirmed."
            },
            {
              "name": "GDPR",
              "confidence": "STATED",
              "year": "STATED",
              "info_text": "Mintlify privacy policy references EU/EEA data subject rights and privacy request mechanisms."
            },
            {
              "name": "ISO 27001",
              "confidence": "NOT FOUND",
              "year": "NOT FOUND",
              "info_text": "No public ISO 27001 certification was found on Mintlify trust, legal, or pricing pages."
            },
            {
              "name": "HIPAA",
              "confidence": "NOT FOUND",
              "year": "NOT FOUND",
              "info_text": "No public HIPAA compliance statement or BAA offering was found."
            }
          ]
        },
        {
          "type": "confirmed_items",
          "heading": "Stated Compliance",
          "items": [
            {
              "title": "SOC 2",
              "detail": "Mintlify operates a Drata-powered trust center. This strongly suggests active SOC 2 work, though the exact report type was not publicly confirmed.",
              "confidence": "STATED"
            },
            {
              "title": "GDPR",
              "detail": "Mintlify's privacy policy references EU/EEA rights and privacy request mechanisms.",
              "confidence": "STATED"
            }
          ]
        },
        {
          "type": "not_confirmed_items",
          "heading": "Not Detected in Public Sources",
          "items": [
            {
              "title": "ISO 27001",
              "detail": "No ISO 27001 certification was referenced publicly.",
              "confidence": "NOT FOUND"
            },
            {
              "title": "HIPAA",
              "detail": "No HIPAA compliance statement or BAA offering was found publicly.",
              "confidence": "NOT FOUND"
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Is Mintlify SOC 2 compliant?",
          "answer": "Mintlify maintains a Drata-powered trust center. The specific SOC 2 report type was not publicly confirmed during this scan.",
          "confidence": "STATED"
        },
        {
          "question": "Is Mintlify GDPR compliant?",
          "answer": "Mintlify's privacy policy references EU/EEA privacy rights and request mechanisms.",
          "confidence": "STATED"
        }
      ]
      $f$::jsonb,
      '["security.mintlify.com","mintlify.com/legal/privacy","mintlify.com/enterprise","mintlify.com/pricing"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'leadership-and-people',
      'policies-and-legal'
    ),
    (
      v_company_id,
      v_run_id,
      'policies',
      'policies-and-legal',
      'Mintlify Policies & Legal',
      'Published legal and policy documents available from Mintlify.',
      TRUE,
      50,
      $p$
      [
        {
          "type": "published_policies",
          "heading": "Published Policies",
          "items": [
            {
              "name": "Privacy Policy",
              "url": "https://mintlify.com/legal/privacy",
              "summary": "Covers data collection, processing, sharing, and retention practices.",
              "confidence": "VERIFIED"
            },
            {
              "name": "Terms of Service",
              "url": "https://mintlify.com/legal/terms",
              "summary": "Governs use of Mintlify's platform and service terms.",
              "confidence": "VERIFIED"
            },
            {
              "name": "Third-Party Provider Terms",
              "url": "https://mintlify.com/legal/third-party-provider-terms",
              "summary": "Lists subprocessors and AI providers.",
              "confidence": "VERIFIED"
            },
            {
              "name": "Responsible Disclosure Policy",
              "url": "https://mintlify.com/security/responsible-disclosure",
              "summary": "Defines vulnerability reporting process and scope.",
              "confidence": "VERIFIED"
            }
          ]
        },
        {
          "type": "confirmed_items",
          "heading": "AI Provider Terms",
          "items": [
            {
              "title": "Anthropic",
              "detail": "Mintlify uses Anthropic as an AI provider.",
              "confidence": "VERIFIED"
            },
            {
              "title": "OpenAI",
              "detail": "OpenAI is listed as an AI provider in Mintlify terms.",
              "confidence": "VERIFIED"
            },
            {
              "title": "Google",
              "detail": "Google is also listed as an AI provider in Mintlify terms.",
              "confidence": "VERIFIED"
            }
          ]
        },
        {
          "type": "not_found_policies",
          "heading": "Not Found in Public Documentation",
          "items": [
            {
              "name": "Data Processing Agreement (DPA)",
              "detail": "No public DPA was found.",
              "confidence": "NOT FOUND"
            },
            {
              "name": "Service Level Agreement (SLA)",
              "detail": "No standalone public SLA document was found.",
              "confidence": "NOT FOUND"
            },
            {
              "name": "Cookie Policy",
              "detail": "No dedicated cookie policy was found.",
              "confidence": "NOT FOUND"
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Does Mintlify publish a DPA?",
          "answer": "No public DPA was found in Mintlify's legal documentation.",
          "confidence": "NOT FOUND"
        },
        {
          "question": "What AI providers does Mintlify use?",
          "answer": "Mintlify uses Anthropic, OpenAI, and Google as AI/LLM providers.",
          "confidence": "VERIFIED"
        }
      ]
      $f$::jsonb,
      '["mintlify.com/legal/privacy","mintlify.com/legal/terms","mintlify.com/legal/third-party-provider-terms","mintlify.com/security/responsible-disclosure"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'compliance-status',
      'subprocessors'
    ),
    (
      v_company_id,
      v_run_id,
      'subprocessors',
      'subprocessors',
      'Mintlify Subprocessors',
      'Third-party services that process data on behalf of Mintlify.',
      TRUE,
      60,
      $p$
      [
        {
          "type": "subprocessor_table",
          "subprocessors": [
            {"service":"Helicone","purpose":"LLM middleware provider","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"OpenRouter","purpose":"LLM failover provider","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"AWS","purpose":"Cloud infrastructure","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"CamelAI","purpose":"Analytics dashboarding","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"Clay","purpose":"Customer enrichment","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"ClickHouse Cloud","purpose":"Data storage and hosting","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"Datadog","purpose":"Logging and monitoring","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"MongoDB Atlas","purpose":"Data storage and hosting","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"Plain","purpose":"Help center and support","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"PostHog","purpose":"Product analytics","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"Stripe","purpose":"Payment processing","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"Stytch","purpose":"Authentication","location":"Not specified","status":"active","confidence":"VERIFIED"},
            {"service":"Vercel","purpose":"Hosting and delivery","location":"Not specified","status":"active","confidence":"VERIFIED"}
          ]
        },
        {
          "type": "note",
          "content": "Mintlify also uses Anthropic, OpenAI, and Google as AI/LLM providers under separate provider terms."
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "How many subprocessors does Mintlify use?",
          "answer": "Mintlify discloses 13 subprocessors, plus AI providers Anthropic, OpenAI, and Google.",
          "confidence": "VERIFIED"
        },
        {
          "question": "Where does Mintlify store customer data?",
          "answer": "Mintlify uses AWS, ClickHouse Cloud, MongoDB Atlas, and Vercel for infrastructure and data storage. Public region details were not disclosed.",
          "confidence": "VERIFIED"
        }
      ]
      $f$::jsonb,
      '["mintlify.com/legal/third-party-provider-terms"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'policies-and-legal',
      'data-handling-and-privacy'
    ),
    (
      v_company_id,
      v_run_id,
      'data_handling',
      'data-handling-and-privacy',
      'Mintlify Data Handling',
      'How Mintlify collects, processes, and protects user data.',
      TRUE,
      70,
      $p$
      [
        {
          "type": "confirmed_items",
          "heading": "Confirmed Data Handling Practices",
          "items": [
            {
              "title": "No sensitive personal information",
              "detail": "Mintlify states it does not process sensitive personal information.",
              "confidence": "VERIFIED"
            },
            {
              "title": "No third-party personal information intake",
              "detail": "Mintlify states it does not receive personal information from third parties.",
              "confidence": "VERIFIED"
            },
            {
              "title": "Service delivery and improvement",
              "detail": "Personal information is processed to provide, improve, and administer Mintlify services.",
              "confidence": "VERIFIED"
            },
            {
              "title": "PostHog analytics",
              "detail": "PostHog analytics collects anonymized data and sanitized session replays.",
              "confidence": "VERIFIED"
            }
          ]
        },
        {
          "type": "not_confirmed_items",
          "heading": "Not Confirmed in Public Documentation",
          "items": [
            {
              "title": "Retention periods",
              "detail": "Data retention periods are not specified publicly.",
              "confidence": "NOT FOUND"
            },
            {
              "title": "AI model training usage",
              "detail": "No explicit public statement was found about using customer content for AI model training.",
              "confidence": "NOT FOUND"
            },
            {
              "title": "Detailed encryption methods",
              "detail": "Specific encryption methods beyond TLS were not described publicly.",
              "confidence": "NOT FOUND"
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Does Mintlify use customer data for AI training?",
          "answer": "Mintlify's published privacy policy and provider terms do not contain an explicit statement on this.",
          "confidence": "NOT FOUND"
        },
        {
          "question": "Does Mintlify process sensitive personal information?",
          "answer": "No. Mintlify states it does not process sensitive personal information.",
          "confidence": "VERIFIED"
        }
      ]
      $f$::jsonb,
      '["mintlify.com/legal/privacy","mintlify.com/legal/third-party-provider-terms"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'subprocessors',
      'incident-response-and-clarity'
    ),
    (
      v_company_id,
      v_run_id,
      'incident_response',
      'incident-response-and-clarity',
      'Mintlify Incident Response',
      'Incident response capabilities and monitoring observed for Mintlify.',
      TRUE,
      80,
      $p$
      [
        {
          "type": "confirmed_capabilities",
          "heading": "Confirmed Incident Response Capabilities",
          "items": [
            {
              "title": "Public status page",
              "detail": "Mintlify operates a public status page at status.mintlify.com.",
              "confidence": "VERIFIED"
            },
            {
              "title": "Historical uptime reporting",
              "detail": "Status page reports Documentation 99.86%, Updates 100%, and Dashboard 99.98% for the recent period reviewed.",
              "confidence": "VERIFIED"
            },
            {
              "title": "24/7 monitoring on Enterprise",
              "detail": "Pricing page references 24/7 incident monitoring on Enterprise.",
              "confidence": "STATED"
            },
            {
              "title": "Responsible disclosure program",
              "detail": "Mintlify accepts security reports at security@mintlify.com and publishes a scope-defined responsible disclosure process.",
              "confidence": "VERIFIED"
            }
          ]
        },
        {
          "type": "not_confirmed_capabilities",
          "heading": "Not Confirmed in Public Documentation",
          "items": [
            {
              "title": "Published incident response plan",
              "detail": "No public incident response runbook was found.",
              "confidence": "NOT FOUND"
            },
            {
              "title": "Customer breach notification timelines",
              "detail": "No public notification timeline for security incidents affecting customer data was found.",
              "confidence": "NOT FOUND"
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Does Mintlify have a status page?",
          "answer": "Yes. Mintlify operates a public status page at status.mintlify.com.",
          "confidence": "VERIFIED"
        }
      ]
      $f$::jsonb,
      '["status.mintlify.com","mintlify.com/security/responsible-disclosure","mintlify.com/pricing"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'data-handling-and-privacy',
      'website-compliance-scan'
    ),
    (
      v_company_id,
      v_run_id,
      'website_scan',
      'website-compliance-scan',
      'Mintlify Website Security Scan',
      'Technical security scan results for mintlify.com.',
      TRUE,
      90,
      $p$
      [
        {
          "type": "website_security_cards",
          "heading": "Website Security Headers",
          "cards": [
            {
              "header": "Strict-Transport-Security (HSTS)",
              "status": "present",
              "detail": "HSTS is enforced with max-age=63072000.",
              "severity": "pass"
            },
            {
              "header": "X-Frame-Options",
              "status": "present",
              "detail": "Set to DENY.",
              "severity": "pass"
            },
            {
              "header": "Content-Security-Policy (CSP)",
              "status": "absent",
              "detail": "No Content-Security-Policy header was detected.",
              "severity": "medium"
            },
            {
              "header": "X-Content-Type-Options",
              "status": "absent",
              "detail": "No X-Content-Type-Options header was found.",
              "severity": "low"
            },
            {
              "header": "Permissions-Policy",
              "status": "absent",
              "detail": "No Permissions-Policy header was detected.",
              "severity": "low"
            },
            {
              "header": "Server Header",
              "status": "disclosed",
              "detail": "Server reveals Vercel and X-Powered-By reveals Next.js.",
              "severity": "info"
            }
          ]
        },
        {
          "type": "website_security_cards",
          "heading": "Email Security (DNS)",
          "cards": [
            {
              "header": "SPF",
              "status": "present",
              "detail": "SPF record authorizes Google Workspace, SendGrid, and Stytch with hard fail policy.",
              "severity": "pass"
            },
            {
              "header": "DKIM",
              "status": "present",
              "detail": "DKIM is configured for mintlify.com.",
              "severity": "pass"
            },
            {
              "header": "DMARC",
              "status": "present — reject",
              "detail": "DMARC is configured with reject policy.",
              "severity": "pass"
            },
            {
              "header": "MX",
              "status": "present",
              "detail": "Mail is handled by Google Workspace.",
              "severity": "pass"
            }
          ]
        },
        {
          "type": "note",
          "content": "TLS supports versions 1.2 and 1.3 with a valid certificate. One cookie was set before consent and no consent banner was detected."
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "Does mintlify.com enforce HTTPS?",
          "answer": "Yes. Mintlify enforces HTTPS via HSTS and supports TLS 1.2 and TLS 1.3.",
          "confidence": "DETECTED"
        },
        {
          "question": "Is Mintlify's email domain protected against spoofing?",
          "answer": "Yes. Mintlify has SPF, DKIM, and DMARC with reject policy configured.",
          "confidence": "DETECTED"
        }
      ]
      $f$::jsonb,
      '["HTTP header scan","TLS certificate scan","DNS record lookup"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'incident-response-and-clarity',
      'integrations-and-tech-stack'
    ),
    (
      v_company_id,
      v_run_id,
      'tech_stack',
      'integrations-and-tech-stack',
      'Mintlify Tech Stack',
      'Technologies used by Mintlify as reported by enrichment and public signals.',
      TRUE,
      100,
      $p$
      [
        {
          "type": "tech_categories",
          "categories": [
            {
              "category": "Frontend & Frameworks",
              "technologies": [
                {"name":"Next.js"},
                {"name":"React"},
                {"name":"TypeScript"},
                {"name":"Javascript"},
                {"name":"CSS"},
                {"name":"Markdown"}
              ]
            },
            {
              "category": "Cloud Infrastructure & Hosting",
              "technologies": [
                {"name":"Vercel"},
                {"name":"AWS"},
                {"name":"Cloudflare DNS"},
                {"name":"ClickHouse Cloud"},
                {"name":"MongoDB Atlas"}
              ]
            },
            {
              "category": "AI & Machine Learning",
              "technologies": [
                {"name":"Anthropic"},
                {"name":"OpenAI"},
                {"name":"Google"},
                {"name":"Helicone"},
                {"name":"OpenRouter"}
              ]
            },
            {
              "category": "Analytics & Monitoring",
              "technologies": [
                {"name":"Google Tag Manager"},
                {"name":"PostHog"},
                {"name":"Datadog"},
                {"name":"CamelAI"}
              ]
            },
            {
              "category": "Authentication & Payments",
              "technologies": [
                {"name":"Stytch"},
                {"name":"Stripe"}
              ]
            },
            {
              "category": "Communication & Collaboration",
              "technologies": [
                {"name":"Gmail"},
                {"name":"Google Apps"},
                {"name":"Slack"},
                {"name":"Figma"},
                {"name":"Plain"}
              ]
            },
            {
              "category": "Development Tools",
              "technologies": [
                {"name":"Git"},
                {"name":"GitHub"},
                {"name":"Retool"}
              ]
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "What framework does Mintlify use?",
          "answer": "Mintlify's website is built with Next.js and React, hosted on Vercel.",
          "confidence": "DETECTED"
        },
        {
          "question": "What LLM providers does Mintlify use?",
          "answer": "Mintlify uses Anthropic, OpenAI, and Google as AI/LLM providers.",
          "confidence": "VERIFIED"
        }
      ]
      $f$::jsonb,
      '["Apollo enrichment","mintlify.com/legal/third-party-provider-terms","HTTP response headers","DNS records"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'website-compliance-scan',
      'assessment-findings'
    ),
    (
      v_company_id,
      v_run_id,
      'assessment',
      'assessment-findings',
      'Mintlify Assessment Findings',
      'Summary of security posture findings for Mintlify.',
      TRUE,
      110,
      $p$
      [
        {
          "type": "assessment_cards",
          "cards": [
            {
              "category": "Email Security",
              "severity": "low",
              "finding": "Mintlify has SPF, DKIM, and DMARC with reject policy configured."
            },
            {
              "category": "Transport Encryption",
              "severity": "low",
              "finding": "TLS 1.2 and 1.3 are supported with valid certificate and HSTS."
            },
            {
              "category": "HTTP Security Headers",
              "severity": "medium",
              "finding": "CSP, X-Content-Type-Options, and Permissions-Policy headers are absent."
            },
            {
              "category": "Vulnerability Disclosure",
              "severity": "low",
              "finding": "Mintlify maintains a responsible disclosure program and security contact."
            },
            {
              "category": "Vendor Transparency",
              "severity": "low",
              "finding": "Mintlify publishes a complete subprocessor list and AI provider list."
            },
            {
              "category": "Cookie Consent",
              "severity": "medium",
              "finding": "A PostHog cookie was set before consent and no cookie consent mechanism was detected."
            }
          ]
        }
      ]
      $p$::jsonb,
      $f$
      [
        {
          "question": "What are the main security gaps identified in Mintlify's public posture?",
          "answer": "The primary gaps are missing HTTP hardening headers and a pre-consent cookie without a visible consent mechanism.",
          "confidence": "DETECTED"
        }
      ]
      $f$::jsonb,
      '["DNS scan","TLS scanner","HTTP header scan","Cookie scan","mintlify.com/security/responsible-disclosure","mintlify.com/legal/third-party-provider-terms"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'integrations-and-tech-stack',
      'security-faq'
    ),
    (
      v_company_id,
      v_run_id,
      'faq',
      'security-faq',
      'Mintlify Security FAQ',
      'Frequently asked security, compliance, and procurement questions about Mintlify.',
      TRUE,
      120,
      $p$
      [
        {
          "type": "faq_list",
          "faqs": [
            {
              "question": "Is Mintlify SOC 2 compliant?",
              "answer": "Mintlify operates a Drata-powered trust center, which is consistent with active SOC 2 efforts, though the exact report type was not publicly confirmed.",
              "confidence": "STATED"
            },
            {
              "question": "Has Mintlify had any data breaches or security incidents?",
              "answer": "No public security incidents or data breaches were identified in this seed data.",
              "confidence": "NOT FOUND"
            },
            {
              "question": "Does Mintlify use customer data for AI model training?",
              "answer": "Mintlify's public privacy policy and provider terms do not explicitly address this.",
              "confidence": "NOT FOUND"
            },
            {
              "question": "Does Mintlify support SSO?",
              "answer": "Yes. SSO login is listed as a feature on the Enterprise plan.",
              "confidence": "STATED"
            },
            {
              "question": "Is Mintlify GDPR compliant?",
              "answer": "Mintlify privacy documentation references EU/EEA data subject rights and privacy request mechanisms.",
              "confidence": "STATED"
            },
            {
              "question": "Does Mintlify have a responsible disclosure program?",
              "answer": "Yes. Mintlify publishes a responsible disclosure policy and accepts reports at security@mintlify.com.",
              "confidence": "VERIFIED"
            },
            {
              "question": "Where is Mintlify's customer data stored?",
              "answer": "Mintlify uses AWS, ClickHouse Cloud, MongoDB Atlas, and Vercel for infrastructure and data storage. Public region details were not disclosed.",
              "confidence": "VERIFIED"
            },
            {
              "question": "What is Mintlify's uptime SLA?",
              "answer": "Mintlify advertises a 99.99% uptime SLA on its Enterprise plan.",
              "confidence": "STATED"
            }
          ]
        }
      ]
      $p$::jsonb,
      '[]'::jsonb,
      '["security.mintlify.com","status.mintlify.com","mintlify.com/legal/privacy","mintlify.com/legal/third-party-provider-terms","mintlify.com/security/responsible-disclosure","mintlify.com/pricing"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'assessment-findings',
      'requests-and-documents'
    ),
    (
      v_company_id,
      v_run_id,
      'requests',
      'requests-and-documents',
      'Mintlify Requests & Documents',
      'Request security documentation and compliance materials from Mintlify.',
      TRUE,
      130,
      $p$
      [
        {
          "type": "questionnaire_cta",
          "content": "Need Mintlify to complete a security questionnaire? Submit your request through DSALTA to streamline the process."
        },
        {
          "type": "published_policies",
          "heading": "Requestable Documents",
          "items": [
            {
              "name": "SOC 2 Report",
              "summary": "Request via trust center.",
              "url": "https://security.mintlify.com",
              "confidence": "STATED"
            },
            {
              "name": "Data Processing Agreement (DPA)",
              "summary": "Not publicly available — contact Mintlify.",
              "confidence": "NOT FOUND"
            },
            {
              "name": "Service Level Agreement (SLA)",
              "summary": "Available for Enterprise customers — contact sales.",
              "confidence": "STATED"
            },
            {
              "name": "Penetration Test Report",
              "summary": "Not publicly available — contact Mintlify.",
              "confidence": "NOT FOUND"
            }
          ]
        },
        {
          "type": "available_materials",
          "heading": "Publicly Available Materials",
          "materials": [
            {"name":"Trust Center (Drata)","url":"https://security.mintlify.com"},
            {"name":"Privacy Policy","url":"https://mintlify.com/legal/privacy"},
            {"name":"Terms of Service","url":"https://mintlify.com/legal/terms"},
            {"name":"Third-Party Provider Terms","url":"https://mintlify.com/legal/third-party-provider-terms"},
            {"name":"Responsible Disclosure Policy","url":"https://mintlify.com/security/responsible-disclosure"},
            {"name":"Status Page","url":"https://status.mintlify.com"}
          ]
        },
        {
          "type": "confirmed_items",
          "heading": "Security Contacts",
          "items": [
            {
              "title": "Security",
              "detail": "security@mintlify.com",
              "confidence": "VERIFIED"
            },
            {
              "title": "General",
              "detail": "hi@mintlify.com",
              "confidence": "VERIFIED"
            },
            {
              "title": "Enterprise Demo",
              "detail": "https://mintlify.com/enterprise",
              "confidence": "VERIFIED"
            }
          ]
        }
      ]
      $p$::jsonb,
      '[]'::jsonb,
      '["security.mintlify.com","mintlify.com/legal/privacy","mintlify.com/legal/terms","mintlify.com/legal/third-party-provider-terms","mintlify.com/security/responsible-disclosure","status.mintlify.com"]'::jsonb,
      'This profile was generated from publicly available information and has not been reviewed or verified by Mintlify.',
      'security-faq',
      NULL
    );

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_pages'
      AND column_name = 'nav_group'
  ) THEN
    UPDATE company_pages
    SET nav_group = 'OVERVIEW'
    WHERE company_id = v_company_id
      AND page_key IN ('overview', 'security', 'leadership');

    UPDATE company_pages
    SET nav_group = 'COMPLIANCE & SECURITY'
    WHERE company_id = v_company_id
      AND page_key IN ('compliance', 'policies', 'subprocessors', 'data_handling', 'incident_response', 'website_scan', 'tech_stack', 'assessment');

    UPDATE company_pages
    SET nav_group = 'RESOURCES'
    WHERE company_id = v_company_id
      AND page_key IN ('faq', 'requests');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_pages'
      AND column_name = 'nav_label'
  ) THEN
    UPDATE company_pages SET nav_label = 'Company Overview' WHERE company_id = v_company_id AND page_key = 'overview';
    UPDATE company_pages SET nav_label = 'Security Overview' WHERE company_id = v_company_id AND page_key = 'security';
    UPDATE company_pages SET nav_label = 'Leadership & People' WHERE company_id = v_company_id AND page_key = 'leadership';
    UPDATE company_pages SET nav_label = 'Compliance Status' WHERE company_id = v_company_id AND page_key = 'compliance';
    UPDATE company_pages SET nav_label = 'Policies & Legal' WHERE company_id = v_company_id AND page_key = 'policies';
    UPDATE company_pages SET nav_label = 'Subprocessors' WHERE company_id = v_company_id AND page_key = 'subprocessors';
    UPDATE company_pages SET nav_label = 'Data Handling & Privacy' WHERE company_id = v_company_id AND page_key = 'data_handling';
    UPDATE company_pages SET nav_label = 'Incident Response & Clarity' WHERE company_id = v_company_id AND page_key = 'incident_response';
    UPDATE company_pages SET nav_label = 'Website Compliance Scan' WHERE company_id = v_company_id AND page_key = 'website_scan';
    UPDATE company_pages SET nav_label = 'Integrations & Tech Stack' WHERE company_id = v_company_id AND page_key = 'tech_stack';
    UPDATE company_pages SET nav_label = 'Assessment Findings' WHERE company_id = v_company_id AND page_key = 'assessment';
    UPDATE company_pages SET nav_label = 'Security FAQ' WHERE company_id = v_company_id AND page_key = 'faq';
    UPDATE company_pages SET nav_label = 'Requests & Documents' WHERE company_id = v_company_id AND page_key = 'requests';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_pages'
      AND column_name = 'show_in_sidebar'
  ) THEN
    UPDATE company_pages
    SET show_in_sidebar = TRUE
    WHERE company_id = v_company_id;
  END IF;

END;
$seed$;

COMMIT;