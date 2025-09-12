// backend/forum/authz.optional.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ЕДИНЫЕ настройки JWT (как в login и ensureAuth)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ALGS = (process.env.JWT_ALGS || 'HS256')
  .split(',')
  .map(s => s.trim());

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  const c = req.cookies || {};
  return c.token || c.jwt || c.accessToken || c.authToken || c.bearer || null;
}

function getUserIdFromPayload(decoded) {
  return decoded?.id || decoded?._id || decoded?.userId || decoded?.uid || null;
}

async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) { req.user = null; return next(); }

    // Верифицируем тем же секретом/алгоритмами
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ALGS, clockTolerance: 5 });
    const uid = getUserIdFromPayload(decoded);
    if (!uid) { req.user = null; return next(); }

    const user = await User.findById(uid).lean();
    req.user = user || null;
    req.auth = decoded;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

module.exports = { optionalAuth };