import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'landing-pages.db'));

// Initialize database schema
db.exec(`
  -- Landing Pages table
  CREATE TABLE IF NOT EXISTS landing_pages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    client_name TEXT,
    html_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    deployed_at TEXT,
    custom_domain TEXT,
    meta_title TEXT,
    meta_description TEXT,
    tracking_pixel TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- A/B Test Variants table
  CREATE TABLE IF NOT EXISTS ab_variants (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    html_content TEXT NOT NULL,
    weight INTEGER DEFAULT 50,
    is_control INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
  );

  -- Leads/Form Submissions table
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id TEXT NOT NULL,
    variant_id TEXT,
    email TEXT,
    name TEXT,
    phone TEXT,
    company TEXT,
    form_data TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES landing_pages(id)
  );

  -- Page Views / Analytics table
  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES landing_pages(id)
  );

  -- Conversions table (for tracking specific conversion events)
  CREATE TABLE IF NOT EXISTS conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id TEXT NOT NULL,
    variant_id TEXT,
    session_id TEXT,
    conversion_type TEXT NOT NULL,
    conversion_value REAL,
    lead_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES landing_pages(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  -- Custom Domains table
  CREATE TABLE IF NOT EXISTS custom_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    domain_type TEXT DEFAULT 'subdomain',
    ssl_status TEXT DEFAULT 'pending',
    dns_configured INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_leads_page_id ON leads(page_id);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id);
  CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
  CREATE INDEX IF NOT EXISTS idx_conversions_page_id ON conversions(page_id);
  CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
  CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
`);

export default db;
