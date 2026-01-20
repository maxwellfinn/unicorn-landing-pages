import { sql } from '@vercel/postgres';
import { nanoid } from 'nanoid';
import { injectTrackingScript } from '../lib/tracking.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel } = req.body;

    if (!name || !html_content) {
      return res.status(400).json({ error: 'Name and HTML content are required' });
    }

    const id = nanoid(10);
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const processedHtml = injectTrackingScript(html_content, id);

    // Save to database with live status - page is served directly via /p/[slug]
    await sql`
      INSERT INTO landing_pages (id, name, slug, client_name, html_content, meta_title, meta_description, tracking_pixel, status, deployed_at)
      VALUES (${id}, ${name}, ${finalSlug}, ${client_name || null}, ${processedHtml}, ${meta_title || null}, ${meta_description || null}, ${tracking_pixel || null}, 'live', CURRENT_TIMESTAMP)
    `;

    // Use configured base URL or default to unicornmarketers.com
    const baseUrl = process.env.PAGES_BASE_URL || 'https://unicornmarketers.com';
    const liveUrl = `${baseUrl}/p/${finalSlug}`;

    const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;

    return res.status(201).json({
      deployed: true,
      liveUrl,
      page: rows[0]
    });
  } catch (error) {
    console.error('Deploy Error:', error);
    if (error.message?.includes('duplicate key')) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
}
