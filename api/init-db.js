import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Only allow POST with a secret key
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== process.env.INIT_DB_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = [];

    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS landing_pages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        client_name TEXT,
        html_content TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        deployed_at TIMESTAMP,
        custom_domain TEXT,
        meta_title TEXT,
        meta_description TEXT,
        tracking_pixel TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('landing_pages table created');

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        variant_id TEXT,
        email TEXT,
        name TEXT,
        phone TEXT,
        company TEXT,
        form_data JSONB,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('leads table created');

    await sql`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        variant_id TEXT,
        session_id TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        device_type TEXT,
        country TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('page_views table created');

    await sql`
      CREATE TABLE IF NOT EXISTS conversions (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        variant_id TEXT,
        session_id TEXT,
        conversion_type TEXT NOT NULL,
        conversion_value DECIMAL,
        lead_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('conversions table created');

    await sql`
      CREATE TABLE IF NOT EXISTS custom_domains (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        domain_type TEXT DEFAULT 'subdomain',
        ssl_status TEXT DEFAULT 'pending',
        dns_configured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('custom_domains table created');

    // V2 Tables
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        website_url TEXT,
        industry TEXT,
        business_research JSONB,
        source_content JSONB,
        verified_facts JSONB,
        testimonials JSONB,
        research_status TEXT DEFAULT 'pending',
        last_researched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('clients table created');

    await sql`
      CREATE TABLE IF NOT EXISTS brand_style_guides (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        primary_color TEXT,
        secondary_color TEXT,
        accent_color TEXT,
        background_color TEXT,
        text_color TEXT,
        heading_font TEXT,
        body_font TEXT,
        font_weights JSONB,
        font_sizes JSONB,
        border_radius TEXT,
        spacing_unit TEXT,
        max_width TEXT,
        button_style JSONB,
        card_style JSONB,
        brand_voice TEXT,
        tone_keywords JSONB,
        raw_css TEXT,
        screenshot_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('brand_style_guides table created');

    await sql`
      CREATE TABLE IF NOT EXISTS page_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        section_structure JSONB,
        html_skeleton TEXT,
        css_base TEXT,
        industries JSONB,
        conversion_goals JSONB,
        avg_conversion_rate DECIMAL,
        times_used INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('page_templates table created');

    await sql`
      CREATE TABLE IF NOT EXISTS page_generation_jobs (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        page_id TEXT,
        page_type TEXT NOT NULL,
        template_id TEXT,
        target_audience TEXT,
        offer_details TEXT,
        status TEXT DEFAULT 'pending',
        current_step TEXT,
        step_outputs JSONB,
        error_message TEXT,
        tokens_used INTEGER DEFAULT 0,
        estimated_cost DECIMAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `;
    results.push('page_generation_jobs table created');

    await sql`
      CREATE TABLE IF NOT EXISTS verified_claims (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        claim_text TEXT NOT NULL,
        claim_type TEXT,
        source_url TEXT,
        source_text TEXT,
        verification_status TEXT DEFAULT 'unverified',
        confidence_score DECIMAL,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    results.push('verified_claims table created');

    // Add columns to landing_pages
    try {
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS client_id TEXT`;
      results.push('client_id column added');
    } catch (e) { results.push('client_id column skipped'); }

    try {
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS template_id TEXT`;
      results.push('template_id column added');
    } catch (e) { results.push('template_id column skipped'); }

    try {
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS job_id TEXT`;
      results.push('job_id column added');
    } catch (e) { results.push('job_id column skipped'); }

    try {
      await sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS generation_metadata JSONB`;
      results.push('generation_metadata column added');
    } catch (e) { results.push('generation_metadata column skipped'); }

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_page_id ON leads(page_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_clients_website_url ON clients(website_url)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_brand_style_guides_client_id ON brand_style_guides(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_templates_type ON page_templates(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_generation_jobs_client_id ON page_generation_jobs(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_generation_jobs_status ON page_generation_jobs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_verified_claims_client_id ON verified_claims(client_id)`;
    results.push('indexes created');

    return res.status(200).json({ success: true, message: 'Database initialized', results });
  } catch (error) {
    console.error('Init DB Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
