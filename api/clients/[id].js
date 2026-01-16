import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Client ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single client with all related data
      const clientResult = await sql`
        SELECT * FROM clients WHERE id = ${id}
      `;

      if (clientResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      const client = clientResult.rows[0];

      // Get brand guide
      const brandResult = await sql`
        SELECT * FROM brand_style_guides WHERE client_id = ${id}
      `;

      // Get verified claims
      const claimsResult = await sql`
        SELECT * FROM verified_claims WHERE client_id = ${id} ORDER BY created_at DESC
      `;

      // Get landing pages
      const pagesResult = await sql`
        SELECT id, name, slug, status, created_at FROM landing_pages WHERE client_id = ${id} ORDER BY created_at DESC
      `;

      // Get recent jobs
      const jobsResult = await sql`
        SELECT * FROM page_generation_jobs WHERE client_id = ${id} ORDER BY created_at DESC LIMIT 10
      `;

      return res.status(200).json({
        success: true,
        client: {
          ...client,
          business_research: client.business_research || null,
          verified_facts: client.verified_facts || null,
          testimonials: client.testimonials || null
        },
        brand_guide: brandResult.rows[0] || null,
        verified_claims: claimsResult.rows,
        landing_pages: pagesResult.rows,
        recent_jobs: jobsResult.rows
      });
    }

    if (req.method === 'PUT') {
      // Update client
      const { name, website_url, industry, business_research, verified_facts, testimonials, research_status } = req.body;

      const now = new Date().toISOString();

      await sql`
        UPDATE clients
        SET
          name = COALESCE(${name}, name),
          website_url = COALESCE(${website_url}, website_url),
          industry = COALESCE(${industry}, industry),
          business_research = COALESCE(${business_research ? JSON.stringify(business_research) : null}::jsonb, business_research),
          verified_facts = COALESCE(${verified_facts ? JSON.stringify(verified_facts) : null}::jsonb, verified_facts),
          testimonials = COALESCE(${testimonials ? JSON.stringify(testimonials) : null}::jsonb, testimonials),
          research_status = COALESCE(${research_status}, research_status),
          updated_at = ${now}
        WHERE id = ${id}
      `;

      const result = await sql`SELECT * FROM clients WHERE id = ${id}`;

      return res.status(200).json({
        success: true,
        client: result.rows[0]
      });
    }

    if (req.method === 'DELETE') {
      // Delete client (cascades to brand_guide, verified_claims)
      await sql`DELETE FROM clients WHERE id = ${id}`;

      return res.status(200).json({
        success: true,
        message: 'Client deleted successfully'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Client API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
