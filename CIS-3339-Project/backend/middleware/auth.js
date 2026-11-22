// Sprint 3 (S1): reusable authentication and authorization middleware.
//
//   requireAuth          -> 401 unless the request carries a valid, unexpired JWT
//   requireRole('editor') -> 403 unless the logged-in user has one of the given roles
//
// Usage in a route file:
//   router.get('/', requireAuth, handler)                          // any logged-in user
//   router.post('/', requireAuth, requireRole('editor'), handler)  // editors only
//
// After requireAuth runs, req.user = { id, name, role, orgId }. orgId comes from the signed
// token, never from the request body or URL, so utils/withOrg.js can trust it.

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Both middleware answer in the same { error } shape the B2 error handler uses
function deny(res, status, message) {
  return res.status(status).json({ error: message });
}

function requireAuth(req, res, next) {
  const header = req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return deny(res, 401, 'Please log in to continue');
  }

  let payload;
  try {
    // only accept the algorithm we sign with, so a token can't pick a weaker one
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired, please log in again'
        : 'Your session is not valid, please log in again';
    return deny(res, 401, message);
  }

  // tokens from the old template had no orgId; without it we can't scope any query
  if (!payload.orgId || !mongoose.isValidObjectId(payload.orgId) || !payload.role) {
    return deny(res, 401, 'Your session is not valid, please log in again');
  }

  req.user = {
    id: payload.sub,
    name: payload.name,
    role: payload.role,
    orgId: payload.orgId
  };
  return next();
}

// requireRole('editor') or requireRole('editor', 'admin')
function requireRole(...roles) {
  return function checkRole(req, res, next) {
    // requireRole must always come after requireAuth
    if (!req.user) {
      return deny(res, 401, 'Please log in to continue');
    }
    if (!roles.includes(req.user.role)) {
      return deny(res, 403, 'You do not have permission to do that');
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
