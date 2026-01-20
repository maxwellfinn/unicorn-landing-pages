import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { domain } = req.query;
  const decodedDomain = decodeURIComponent(domain);

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT
          cd.*,
          lp.name as page_name,
          lp.slug as page_slug
        FROM custom_domains cd
        LEFT JOIN landing_pages lp ON cd.page_id = lp.id
        WHERE cd.domain = ${decodedDomain}
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      // Get the domain first to find associated page
      const { rows: domainRows } = await sql`
        SELECT * FROM custom_domains WHERE domain = ${decodedDomain}
      `;

      if (domainRows.length === 0) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const domainRecord = domainRows[0];
      const pageId = domainRecord.page_id;

      // Delete the domain
      await sql`DELETE FROM custom_domains WHERE domain = ${decodedDomain}`;

      // If this was the page's primary custom_domain, update it
      const { rows: pageRows } = await sql`
        SELECT custom_domain FROM landing_pages WHERE id = ${pageId}
      `;

      if (pageRows.length > 0 && pageRows[0].custom_domain === decodedDomain) {
        // Try to set another domain as primary, or null
        const { rows: remaining } = await sql`
          SELECT domain FROM custom_domains WHERE page_id = ${pageId} LIMIT 1
        `;
        const newPrimary = remaining.length > 0 ? remaining[0].domain : null;
        await sql`UPDATE landing_pages SET custom_domain = ${newPrimary} WHERE id = ${pageId}`;
      }

      return res.status(200).json({ success: true, message: 'Domain removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Domain API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
