const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT authentication middleware.
 *
 * Usage:
 *   // Protect all routes in a router
 *   router.use(auth);
 *
 *   // Protect a single route
 *   router.get('/secure', auth, handler);
 *
 *   // Skip auth for a specific route – set `skipAuth` on the route before this
 *   // middleware runs, or simply don't apply the middleware to that route.
 *   // Alternatively, mark the request:
 *   router.get('/public', (req, _res, next) => { req.skipAuth = true; next(); }, auth, handler);
 */
function auth(req, res, next) {
  // Allow routes to opt out of authentication
  if (req.skipAuth) {
    return next();
  }

  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = auth;
