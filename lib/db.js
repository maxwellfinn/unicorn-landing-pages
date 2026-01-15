import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDatabase() {
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

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id),
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

  await sql`
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id),
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

  await sql`
    CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id),
      variant_id TEXT,
      session_id TEXT,
      conversion_type TEXT NOT NULL,
      conversion_value DECIMAL,
      lead_id INTEGER REFERENCES leads(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS custom_domains (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
      domain TEXT UNIQUE NOT NULL,
      domain_type TEXT DEFAULT 'subdomain',
      ssl_status TEXT DEFAULT 'pending',
      dns_configured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_page_id ON leads(page_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug)`;
}

export { sql };
