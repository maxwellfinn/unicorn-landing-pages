import { sql } from '@vercel/postgres';
import { deployPage, ensureRepoExists } from '../../../lib/github.js';

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

  const { id } = req.query;

  try {
    if (!process.env.GITHUB_TOKEN) {
      return res.status(400).json({ error: 'GitHub not configured' });
    }

    const { rows } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = rows[0];
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    await ensureRepoExists();
    const result = await deployPage(page.slug, page.html_content, `Deploy: ${page.name}`);

    await sql`UPDATE landing_pages SET status = 'live', deployed_at = CURRENT_TIMESTAMP WHERE id = ${id}`;

    const liveUrl = `https://${owner}.github.io/${repo}/${page.slug}/`;

    const { rows: updated } = await sql`SELECT * FROM landing_pages WHERE id = ${id}`;

    return res.status(200).json({
      deployed: true,
      commitSha: result.commitSha,
      liveUrl,
      page: updated[0]
    });
  } catch (error) {
    console.error('Deploy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
