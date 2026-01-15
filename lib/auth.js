// Simple password-based authentication for the dashboard
// In production, consider using Vercel's built-in auth or a service like Clerk

export function checkAuth(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  return token === process.env.DASHBOARD_PASSWORD;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
