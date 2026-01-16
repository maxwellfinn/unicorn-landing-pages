import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'landing-pages.db'));

// Initialize database schema
db.exec(`
  -- ============================================
  -- NEW TABLES FOR V2 PIPELINE
  -- ============================================

  -- Clients table - stores business research for reuse
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website_url TEXT,
    industry TEXT,
    business_research TEXT,
    source_content TEXT,
    verified_facts TEXT,
    testimonials TEXT,
    research_status TEXT DEFAULT 'pending',
    last_researched_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Brand style guides - extracted brand styles per client
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
    font_weights TEXT,
    font_sizes TEXT,
    border_radius TEXT,
    spacing_unit TEXT,
    max_width TEXT,
    button_style TEXT,
    card_style TEXT,
    brand_voice TEXT,
    tone_keywords TEXT,
    raw_css TEXT,
    screenshot_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  -- Page templates - template library
  CREATE TABLE IF NOT EXISTS page_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    section_structure TEXT,
    html_skeleton TEXT,
    css_base TEXT,
    industries TEXT,
    conversion_goals TEXT,
    avg_conversion_rate REAL,
    times_used INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Page generation jobs - track pipeline progress
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
    step_outputs TEXT,
    error_message TEXT,
    tokens_used INTEGER DEFAULT 0,
    estimated_cost REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (template_id) REFERENCES page_templates(id)
  );

  -- Verified claims - fact-checking database
  CREATE TABLE IF NOT EXISTS verified_claims (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    claim_text TEXT NOT NULL,
    claim_type TEXT,
    source_url TEXT,
    source_text TEXT,
    verification_status TEXT DEFAULT 'unverified',
    confidence_score REAL,
    verified_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  -- ============================================
  -- EXISTING TABLES (with new columns for v2)
  -- ============================================

  -- Landing Pages table
  CREATE TABLE IF NOT EXISTS landing_pages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    client_name TEXT,
    client_id TEXT,
    template_id TEXT,
    job_id TEXT,
    generation_metadata TEXT,
    html_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    deployed_at TEXT,
    custom_domain TEXT,
    meta_title TEXT,
    meta_description TEXT,
    tracking_pixel TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (template_id) REFERENCES page_templates(id),
    FOREIGN KEY (job_id) REFERENCES page_generation_jobs(id)
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

  -- New indexes for v2 tables
  CREATE INDEX IF NOT EXISTS idx_clients_website_url ON clients(website_url);
  CREATE INDEX IF NOT EXISTS idx_brand_style_guides_client_id ON brand_style_guides(client_id);
  CREATE INDEX IF NOT EXISTS idx_page_templates_type ON page_templates(type);
  CREATE INDEX IF NOT EXISTS idx_page_generation_jobs_client_id ON page_generation_jobs(client_id);
  CREATE INDEX IF NOT EXISTS idx_page_generation_jobs_status ON page_generation_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_verified_claims_client_id ON verified_claims(client_id);
  CREATE INDEX IF NOT EXISTS idx_landing_pages_client_id ON landing_pages(client_id);
`);

export default db;
