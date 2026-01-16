import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List all clients
      const result = await sql`
        SELECT
          c.*,
          bsg.id as brand_guide_id,
          (SELECT COUNT(*) FROM landing_pages WHERE client_id = c.id) as page_count,
          (SELECT COUNT(*) FROM verified_claims WHERE client_id = c.id) as claim_count
        FROM clients c
        LEFT JOIN brand_style_guides bsg ON bsg.client_id = c.id
        ORDER BY c.created_at DESC
      `;

      return res.status(200).json({
        success: true,
        clients: result.rows.map(row => ({
          ...row,
          business_research: row.business_research || null,
          verified_facts: row.verified_facts || null,
          testimonials: row.testimonials || null,
          has_brand_guide: !!row.brand_guide_id
        }))
      });
    }

    if (req.method === 'POST') {
      // Create new client
      const { name, website_url, industry } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO clients (id, name, website_url, industry, created_at, updated_at)
        VALUES (${id}, ${name}, ${website_url || null}, ${industry || null}, ${now}, ${now})
      `;

      const result = await sql`SELECT * FROM clients WHERE id = ${id}`;

      return res.status(201).json({
        success: true,
        client: result.rows[0]
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
