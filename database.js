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

  -- ============================================
  -- PHASE 1: AI MARKETING ASSISTANT TABLES
  -- ============================================

  -- Users table for authentication
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'marketer',
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- User sessions for JWT refresh tokens
  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Campaigns - organize ads by client campaigns
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    objective TEXT,
    channel TEXT DEFAULT 'meta',
    target_audience TEXT,
    budget TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Ad copy generations
  CREATE TABLE IF NOT EXISTS ad_copy (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel TEXT DEFAULT 'meta',
    ad_type TEXT,
    primary_text TEXT,
    headline TEXT,
    description TEXT,
    cta TEXT,
    hook_angle TEXT,
    target_audience TEXT,
    offer_details TEXT,
    generation_prompt TEXT,
    model_used TEXT,
    tokens_used INTEGER,
    rating INTEGER,
    feedback TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Image prompt generations for AI image tools
  CREATE TABLE IF NOT EXISTS image_prompts (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ad_copy_id TEXT,
    prompt_text TEXT NOT NULL,
    negative_prompt TEXT,
    style_reference TEXT,
    aspect_ratio TEXT DEFAULT '1:1',
    image_type TEXT,
    model_target TEXT DEFAULT 'nano_banana_2',
    generation_context TEXT,
    rating INTEGER,
    feedback TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (ad_copy_id) REFERENCES ad_copy(id) ON DELETE SET NULL
  );

  -- Ad performance data (for future Meta API integration)
  CREATE TABLE IF NOT EXISTS ad_performance (
    id TEXT PRIMARY KEY,
    ad_copy_id TEXT,
    campaign_id TEXT,
    external_ad_id TEXT,
    channel TEXT DEFAULT 'meta',
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend REAL DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0,
    ctr REAL,
    cpc REAL,
    cpm REAL,
    roas REAL,
    date_range_start TEXT,
    date_range_end TEXT,
    raw_data TEXT,
    synced_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_copy_id) REFERENCES ad_copy(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  -- Swipe files / winning ad examples
  CREATE TABLE IF NOT EXISTS swipe_files (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    client_id TEXT,
    title TEXT NOT NULL,
    channel TEXT,
    ad_type TEXT,
    primary_text TEXT,
    headline TEXT,
    description TEXT,
    image_description TEXT,
    image_url TEXT,
    landing_page_url TEXT,
    why_it_works TEXT,
    hooks_used TEXT,
    tags TEXT,
    source TEXT,
    performance_notes TEXT,
    is_public INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  -- Indexes for new tables
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
  CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
  CREATE INDEX IF NOT EXISTS idx_ad_copy_client_id ON ad_copy(client_id);
  CREATE INDEX IF NOT EXISTS idx_ad_copy_campaign_id ON ad_copy(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_ad_copy_user_id ON ad_copy(user_id);
  CREATE INDEX IF NOT EXISTS idx_image_prompts_client_id ON image_prompts(client_id);
  CREATE INDEX IF NOT EXISTS idx_image_prompts_ad_copy_id ON image_prompts(ad_copy_id);
  CREATE INDEX IF NOT EXISTS idx_ad_performance_ad_copy_id ON ad_performance(ad_copy_id);
  CREATE INDEX IF NOT EXISTS idx_swipe_files_user_id ON swipe_files(user_id);
  CREATE INDEX IF NOT EXISTS idx_swipe_files_tags ON swipe_files(tags);
`);

export default db;
