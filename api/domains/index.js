import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all domains with their associated page info
    const { rows: domains } = await sql`
      SELECT
        cd.id,
        cd.page_id,
        cd.domain,
        cd.domain_type,
        cd.ssl_status,
        cd.dns_configured,
        cd.created_at,
        lp.name as page_name,
        lp.slug as page_slug,
        lp.status as page_status
      FROM custom_domains cd
      LEFT JOIN landing_pages lp ON cd.page_id = lp.id
      ORDER BY cd.created_at DESC
    `;

    return res.status(200).json({ domains });
  } catch (error) {
    console.error('Domains API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
