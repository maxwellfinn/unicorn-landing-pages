import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './database.js';
import { initGitHub, deployPage, deletePage, ensureRepoExists, getPagesUrl, setCustomDomain } from './github.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3457;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'unicorn-landing-pages-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve static files (dashboard) - serves from root directory
app.use(express.static(__dirname));

// Initialize GitHub
if (process.env.GITHUB_TOKEN) {
  initGitHub(process.env.GITHUB_TOKEN);
}

// ============================================================
// LANDING PAGE MANAGEMENT ENDPOINTS
// ============================================================

// Get all landing pages
app.get('/api/pages', (req, res) => {
  try {
    const pages = db.prepare(`
      SELECT
        lp.*,
        (SELECT COUNT(*) FROM page_views WHERE page_id = lp.id) as view_count,
        (SELECT COUNT(*) FROM leads WHERE page_id = lp.id) as lead_count,
        (SELECT COUNT(*) FROM conversions WHERE page_id = lp.id) as conversion_count
      FROM landing_pages lp
      ORDER BY created_at DESC
    `).all();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single landing page
app.get('/api/pages/:id', (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Get variants if any
    const variants = db.prepare('SELECT * FROM ab_variants WHERE page_id = ?').all(req.params.id);
    page.variants = variants;

    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new landing page
app.post('/api/pages', (req, res) => {
  try {
    const { name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel } = req.body;

    if (!name || !html_content) {
      return res.status(400).json({ error: 'Name and HTML content are required' });
    }

    const id = nanoid(10);
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Inject tracking script into HTML
    const processedHtml = injectTrackingScript(html_content, id);

    db.prepare(`
      INSERT INTO landing_pages (id, name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, finalSlug, client_name || null, processedHtml, meta_title || null, meta_description || null, tracking_pixel || null);

    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(id);
    res.status(201).json(page);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update landing page
app.put('/api/pages/:id', (req, res) => {
  try {
    const { name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel, status } = req.body;

    const existing = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Re-inject tracking if HTML changed
    let processedHtml = html_content || existing.html_content;
    if (html_content && html_content !== existing.html_content) {
      processedHtml = injectTrackingScript(html_content, req.params.id);
    }

    db.prepare(`
      UPDATE landing_pages
      SET name = ?, slug = ?, client_name = ?, html_content = ?,
          meta_title = ?, meta_description = ?, tracking_pixel = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || existing.name,
      slug || existing.slug,
      client_name ?? existing.client_name,
      processedHtml,
      meta_title ?? existing.meta_title,
      meta_description ?? existing.meta_description,
      tracking_pixel ?? existing.tracking_pixel,
      status || existing.status,
      req.params.id
    );

    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete landing page
app.delete('/api/pages/:id', async (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Try to delete from GitHub if deployed
    if (page.status === 'live' && process.env.GITHUB_TOKEN) {
      try {
        await deletePage(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, page.slug);
      } catch (error) {
        console.log('Could not delete from GitHub:', error.message);
      }
    }

    db.prepare('DELETE FROM landing_pages WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DEPLOYMENT ENDPOINTS
// ============================================================

// Deploy a landing page to GitHub Pages
app.post('/api/pages/:id/deploy', async (req, res) => {
  try {
    if (!process.env.GITHUB_TOKEN) {
      return res.status(400).json({ error: 'GitHub not configured. Set GITHUB_TOKEN in .env' });
    }

    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    // Ensure repo exists
    await ensureRepoExists(owner, repo);

    // Deploy the page
    const result = await deployPage(owner, repo, page.slug, page.html_content, `Deploy: ${page.name}`);

    // Update page status
    db.prepare(`
      UPDATE landing_pages SET status = 'live', deployed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.params.id);

    // Get the live URL
    const baseUrl = process.env.PAGES_BASE_URL || await getPagesUrl(owner, repo);
    const liveUrl = `${baseUrl}/${page.slug}/`;

    res.json({
      deployed: true,
      commitSha: result.commitSha,
      liveUrl,
      page: db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick deploy - create and deploy in one step (perfect for Claude artifacts)
app.post('/api/deploy', async (req, res) => {
  try {
    const { name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel } = req.body;

    if (!name || !html_content) {
      return res.status(400).json({ error: 'Name and HTML content are required' });
    }

    if (!process.env.GITHUB_TOKEN) {
      return res.status(400).json({ error: 'GitHub not configured. Set GITHUB_TOKEN in .env' });
    }

    const id = nanoid(10);
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Inject tracking script
    const processedHtml = injectTrackingScript(html_content, id);

    // Save to database
    db.prepare(`
      INSERT INTO landing_pages (id, name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'live')
    `).run(id, name, finalSlug, client_name || null, processedHtml, meta_title || null, meta_description || null, tracking_pixel || null);

    // Deploy to GitHub
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    await ensureRepoExists(owner, repo);
    const result = await deployPage(owner, repo, finalSlug, processedHtml, `Deploy: ${name}`);

    // Update deployed timestamp
    db.prepare(`UPDATE landing_pages SET deployed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);

    const baseUrl = process.env.PAGES_BASE_URL || await getPagesUrl(owner, repo);
    const liveUrl = `${baseUrl}/${finalSlug}/`;

    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(id);

    res.status(201).json({
      deployed: true,
      liveUrl,
      commitSha: result.commitSha,
      page
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// A/B TESTING ENDPOINTS
// ============================================================

// Add variant to a page
app.post('/api/pages/:id/variants', (req, res) => {
  try {
    const { variant_name, html_content, weight, is_control } = req.body;

    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const id = nanoid(10);
    const processedHtml = injectTrackingScript(html_content, page.id, id);

    db.prepare(`
      INSERT INTO ab_variants (id, page_id, variant_name, html_content, weight, is_control)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, variant_name, processedHtml, weight || 50, is_control ? 1 : 0);

    const variant = db.prepare('SELECT * FROM ab_variants WHERE id = ?').get(id);
    res.status(201).json(variant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get A/B test results
app.get('/api/pages/:id/ab-results', (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Get control stats
    const controlViews = db.prepare(`
      SELECT COUNT(*) as count FROM page_views WHERE page_id = ? AND (variant_id IS NULL OR variant_id = '')
    `).get(req.params.id).count;

    const controlConversions = db.prepare(`
      SELECT COUNT(*) as count FROM conversions WHERE page_id = ? AND (variant_id IS NULL OR variant_id = '')
    `).get(req.params.id).count;

    // Get variant stats
    const variants = db.prepare('SELECT * FROM ab_variants WHERE page_id = ?').all(req.params.id);

    const variantStats = variants.map(v => {
      const views = db.prepare('SELECT COUNT(*) as count FROM page_views WHERE variant_id = ?').get(v.id).count;
      const conversions = db.prepare('SELECT COUNT(*) as count FROM conversions WHERE variant_id = ?').get(v.id).count;
      return {
        ...v,
        views,
        conversions,
        conversion_rate: views > 0 ? ((conversions / views) * 100).toFixed(2) : 0
      };
    });

    res.json({
      control: {
        name: 'Control (Original)',
        views: controlViews,
        conversions: controlConversions,
        conversion_rate: controlViews > 0 ? ((controlConversions / controlViews) * 100).toFixed(2) : 0
      },
      variants: variantStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LEAD CAPTURE / FORM SUBMISSION ENDPOINTS
// ============================================================

// Submit form (called from landing pages)
app.post('/api/submit/:pageId', (req, res) => {
  try {
    const { email, name, phone, company, ...otherFields } = req.body;
    const pageId = req.params.pageId;
    const variantId = req.body._variant_id || null;

    // Get UTM params from query or body
    const utm_source = req.query.utm_source || req.body.utm_source || null;
    const utm_medium = req.query.utm_medium || req.body.utm_medium || null;
    const utm_campaign = req.query.utm_campaign || req.body.utm_campaign || null;
    const utm_term = req.query.utm_term || req.body.utm_term || null;
    const utm_content = req.query.utm_content || req.body.utm_content || null;

    // Store lead
    const result = db.prepare(`
      INSERT INTO leads (page_id, variant_id, email, name, phone, company, form_data,
                        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
                        ip_address, user_agent, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pageId,
      variantId,
      email || null,
      name || null,
      phone || null,
      company || null,
      JSON.stringify(otherFields),
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      req.ip,
      req.get('User-Agent'),
      req.get('Referer')
    );

    // Record conversion
    db.prepare(`
      INSERT INTO conversions (page_id, variant_id, session_id, conversion_type, lead_id)
      VALUES (?, ?, ?, 'form_submit', ?)
    `).run(pageId, variantId, req.body._session_id || null, result.lastInsertRowid);

    // Return success with redirect option
    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(pageId);

    res.json({
      success: true,
      lead_id: result.lastInsertRowid,
      message: 'Thank you for your submission!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leads for a page
app.get('/api/pages/:id/leads', (req, res) => {
  try {
    const leads = db.prepare(`
      SELECT * FROM leads WHERE page_id = ? ORDER BY created_at DESC
    `).all(req.params.id);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export leads as CSV
app.get('/api/pages/:id/leads/export', (req, res) => {
  try {
    const leads = db.prepare(`
      SELECT * FROM leads WHERE page_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    const page = db.prepare('SELECT name FROM landing_pages WHERE id = ?').get(req.params.id);

    // Build CSV
    const headers = ['id', 'email', 'name', 'phone', 'company', 'utm_source', 'utm_medium', 'utm_campaign', 'created_at'];
    const rows = leads.map(lead =>
      headers.map(h => `"${(lead[h] || '').toString().replace(/"/g, '""')}"`).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${page?.name || 'leads'}-leads.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ANALYTICS ENDPOINTS
// ============================================================

// Track page view (called from landing pages)
app.post('/api/track/:pageId', (req, res) => {
  try {
    const pageId = req.params.pageId;
    const { variant_id, session_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = req.body;

    // Detect device type
    const ua = req.get('User-Agent') || '';
    const deviceType = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop';

    db.prepare(`
      INSERT INTO page_views (page_id, variant_id, session_id, utm_source, utm_medium, utm_campaign,
                             utm_term, utm_content, ip_address, user_agent, referrer, device_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pageId,
      variant_id || null,
      session_id || null,
      utm_source || null,
      utm_medium || null,
      utm_campaign || null,
      utm_term || null,
      utm_content || null,
      req.ip,
      ua,
      req.get('Referer'),
      deviceType
    );

    res.json({ tracked: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track conversion event
app.post('/api/convert/:pageId', (req, res) => {
  try {
    const { variant_id, session_id, conversion_type, conversion_value } = req.body;

    db.prepare(`
      INSERT INTO conversions (page_id, variant_id, session_id, conversion_type, conversion_value)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.pageId, variant_id || null, session_id || null, conversion_type || 'conversion', conversion_value || null);

    res.json({ converted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics for a page
app.get('/api/pages/:id/analytics', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [req.params.id];

    if (start_date) {
      dateFilter += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND created_at <= ?';
      params.push(end_date);
    }

    // Total views
    const totalViews = db.prepare(`
      SELECT COUNT(*) as count FROM page_views WHERE page_id = ?${dateFilter}
    `).get(...params).count;

    // Total leads
    const totalLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads WHERE page_id = ?${dateFilter}
    `).get(...params).count;

    // Total conversions
    const totalConversions = db.prepare(`
      SELECT COUNT(*) as count FROM conversions WHERE page_id = ?${dateFilter}
    `).get(...params).count;

    // Views by day
    const viewsByDay = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as views
      FROM page_views WHERE page_id = ?${dateFilter}
      GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30
    `).all(...params);

    // Views by source
    const viewsBySource = db.prepare(`
      SELECT COALESCE(utm_source, 'direct') as source, COUNT(*) as views
      FROM page_views WHERE page_id = ?${dateFilter}
      GROUP BY utm_source ORDER BY views DESC LIMIT 10
    `).all(...params);

    // Views by device
    const viewsByDevice = db.prepare(`
      SELECT device_type, COUNT(*) as views
      FROM page_views WHERE page_id = ?${dateFilter}
      GROUP BY device_type
    `).all(...params);

    // Conversion rate
    const conversionRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(2) : 0;

    res.json({
      summary: {
        total_views: totalViews,
        total_leads: totalLeads,
        total_conversions: totalConversions,
        conversion_rate: conversionRate
      },
      views_by_day: viewsByDay,
      views_by_source: viewsBySource,
      views_by_device: viewsByDevice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CUSTOM DOMAIN MANAGEMENT
// ============================================================

// Add custom domain to a page
app.post('/api/pages/:id/domain', async (req, res) => {
  try {
    const { domain, domain_type } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Check if domain already exists
    const existing = db.prepare('SELECT * FROM custom_domains WHERE domain = ?').get(domain);
    if (existing) {
      return res.status(400).json({ error: 'This domain is already in use' });
    }

    // Add to custom_domains table
    db.prepare(`
      INSERT INTO custom_domains (page_id, domain, domain_type)
      VALUES (?, ?, ?)
    `).run(req.params.id, domain, domain_type || 'custom');

    // Also update landing_pages for backwards compatibility
    db.prepare('UPDATE landing_pages SET custom_domain = ? WHERE id = ?').run(domain, req.params.id);

    const isSubdomain = domain.includes('.pages.unicornmarketers.com');

    res.json({
      domain,
      page_slug: page.slug,
      instructions: isSubdomain ? {
        step1: 'Domain will be automatically routed via Cloudflare Worker',
        step2: 'Ensure your Cloudflare Worker is deployed and configured',
        step3: 'Add route in Cloudflare: ' + domain + '/* -> your-worker'
      } : {
        step1: 'Add a CNAME record in your DNS provider:',
        step2: `${domain} → pages.unicornmarketers.com`,
        step3: 'Add this domain as a route in your Cloudflare Worker',
        step4: 'SSL will be automatically provisioned by Cloudflare'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all custom domains
app.get('/api/domains', (req, res) => {
  try {
    const domains = db.prepare(`
      SELECT cd.*, lp.name as page_name, lp.slug as page_slug
      FROM custom_domains cd
      JOIN landing_pages lp ON cd.page_id = lp.id
      ORDER BY cd.created_at DESC
    `).all();
    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete custom domain
app.delete('/api/domains/:domain', (req, res) => {
  try {
    const domain = decodeURIComponent(req.params.domain);
    const existing = db.prepare('SELECT * FROM custom_domains WHERE domain = ?').get(domain);

    if (!existing) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    db.prepare('DELETE FROM custom_domains WHERE domain = ?').run(domain);
    db.prepare('UPDATE landing_pages SET custom_domain = NULL WHERE id = ?').run(existing.page_id);

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Cloudflare Worker config (dynamic domain mapping)
app.get('/api/domains/cloudflare-config', (req, res) => {
  try {
    const domains = db.prepare(`
      SELECT cd.domain, lp.slug
      FROM custom_domains cd
      JOIN landing_pages lp ON cd.page_id = lp.id
      WHERE lp.status = 'live'
    `).all();

    const domainMap = {};
    domains.forEach(d => {
      domainMap[d.domain] = d.slug;
    });

    const workerConfig = `
// Auto-generated Cloudflare Worker Domain Map
// Generated: ${new Date().toISOString()}
//
// Copy this into your Cloudflare Worker

const DOMAIN_MAP = ${JSON.stringify(domainMap, null, 2)};

const GITHUB_PAGES_BASE = 'https://${process.env.GITHUB_OWNER}.github.io/${process.env.GITHUB_REPO}';

// Subdomain pattern for automatic routing
// e.g., summer-sale.pages.unicornmarketers.com → /summer-sale/
const SUBDOMAIN_PATTERN = /^([a-z0-9-]+)\\.pages\\.unicornmarketers\\.com$/;

async function handleRequest(request) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  let slug = null;

  // Check if domain is in the explicit map
  if (DOMAIN_MAP[hostname]) {
    slug = DOMAIN_MAP[hostname];
  }

  // Check if it's a subdomain pattern
  const subdomainMatch = hostname.match(SUBDOMAIN_PATTERN);
  if (subdomainMatch) {
    slug = subdomainMatch[1];
  }

  if (!slug) {
    return new Response('Landing page not found', { status: 404 });
  }

  const targetUrl = GITHUB_PAGES_BASE + '/' + slug + (url.pathname === '/' ? '/index.html' : url.pathname);

  const response = await fetch(targetUrl);
  if (!response.ok) {
    return new Response('Landing page not found', { status: 404 });
  }

  return new Response(response.body, response);
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
`;

    res.setHeader('Content-Type', 'application/javascript');
    res.send(workerConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lookup page by domain (used by Cloudflare Worker via API)
app.get('/api/domains/lookup/:domain', (req, res) => {
  try {
    const domain = decodeURIComponent(req.params.domain);

    const result = db.prepare(`
      SELECT lp.slug, lp.id, lp.name
      FROM custom_domains cd
      JOIN landing_pages lp ON cd.page_id = lp.id
      WHERE cd.domain = ? AND lp.status = 'live'
    `).get(domain);

    if (!result) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({
      slug: result.slug,
      page_id: result.id,
      github_url: `https://${process.env.GITHUB_OWNER}.github.io/${process.env.GITHUB_REPO}/${result.slug}/`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function injectTrackingScript(html, pageId, variantId = null) {
  const apiBase = process.env.API_BASE_URL || `http://localhost:${PORT}`;

  const trackingScript = `
<!-- Unicorn Landing Pages Tracking -->
<script>
(function() {
  var pageId = '${pageId}';
  var variantId = ${variantId ? `'${variantId}'` : 'null'};
  var apiBase = '${apiBase}';
  var sessionId = 'session_' + Math.random().toString(36).substr(2, 9);

  // Parse UTM params
  var params = new URLSearchParams(window.location.search);
  var utmData = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content')
  };

  // Track page view
  fetch(apiBase + '/api/track/' + pageId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variant_id: variantId,
      session_id: sessionId,
      ...utmData
    })
  }).catch(function() {});

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.tagName === 'FORM') {
      e.preventDefault();

      var formData = new FormData(form);
      var data = { _session_id: sessionId, _variant_id: variantId };
      formData.forEach(function(value, key) { data[key] = value; });
      Object.assign(data, utmData);

      fetch(apiBase + '/api/submit/' + pageId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res) { return res.json(); })
        .then(function(result) {
          if (result.success) {
            // Check for redirect URL or thank you message
            var redirectUrl = form.getAttribute('data-redirect') || form.dataset.redirect;
            if (redirectUrl) {
              window.location.href = redirectUrl;
            } else {
              // Show success message
              var msg = document.createElement('div');
              msg.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#10b981;color:white;padding:2rem 3rem;border-radius:12px;font-size:1.25rem;z-index:9999;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">✓ Thank you! We\\'ll be in touch soon.</div>';
              document.body.appendChild(msg);
              setTimeout(function() { msg.remove(); }, 3000);
              form.reset();
            }
          }
        }).catch(function() {
          alert('Something went wrong. Please try again.');
        });
    }
  });

  // Expose conversion tracking function
  window.trackConversion = function(type, value) {
    fetch(apiBase + '/api/convert/' + pageId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_id: variantId,
        session_id: sessionId,
        conversion_type: type || 'conversion',
        conversion_value: value
      })
    }).catch(function() {});
  };
})();
</script>
`;

  // Inject before </body> or at end
  if (html.includes('</body>')) {
    return html.replace('</body>', trackingScript + '</body>');
  } else if (html.includes('</html>')) {
    return html.replace('</html>', trackingScript + '</html>');
  } else {
    return html + trackingScript;
  }
}

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🦄 Unicorn Landing Pages Server                            ║
║                                                              ║
║   Dashboard:  http://localhost:${PORT}                         ║
║   API:        http://localhost:${PORT}/api                     ║
║                                                              ║
║   Quick Deploy: POST /api/deploy                             ║
║   { name, html_content, slug?, client_name? }                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!process.env.GITHUB_TOKEN) {
    console.log('⚠️  GitHub not configured. Set GITHUB_TOKEN in .env to enable deployment.\n');
  }
});
