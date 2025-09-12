// authz.optional.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALGS = (process.env.JWT_ALGS || 'HS256').split(',').map(s => s.trim());

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  const c = req.cookies || {};
  return c.token || c.jwt || c.accessToken || c.authToken || c.bearer || null;
}

async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) { req.user = null; return next(); }

    const secret = process.env.JWT_SECRET;
    if (!secret) { req.user = null; return next(); } // молча пропускаем, если нет секрета

    const decoded = jwt.verify(token, secret, { algorithms: ALGS, clockTolerance: 5 });
    const uid = decoded?.id || decoded?._id || decoded?.userId || decoded?.uid || null;
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