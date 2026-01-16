export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  return res.status(200).json({
    hasClaudeKey: !!CLAUDE_API_KEY,
    keyPrefix: CLAUDE_API_KEY ? CLAUDE_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    keyLength: CLAUDE_API_KEY ? CLAUDE_API_KEY.length : 0,
    nodeVersion: process.version,
    env: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('KEY') && !k.includes('TOKEN'))
  });
}
