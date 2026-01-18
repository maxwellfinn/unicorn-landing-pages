import jwt from 'jsonwebtoken';

// Simple password-based authentication for the dashboard (legacy)
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

/**
 * JWT-based authentication for multi-user system
 * Verifies token and returns user data
 */
export async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No token provided'
    });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'unicorn-marketing-secret-change-in-production';

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user, requiredRole) {
  const roleHierarchy = ['marketer', 'admin', 'superadmin'];
  const userRoleIndex = roleHierarchy.indexOf(user.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Middleware to require specific role
 */
export async function requireRole(req, res, requiredRole) {
  const user = await verifyAuth(req, res);
  if (!user) return null;

  if (!hasRole(user, requiredRole)) {
    res.status(403).json({
      success: false,
      error: `Requires ${requiredRole} role or higher`
    });
    return null;
  }

  return user;
}
