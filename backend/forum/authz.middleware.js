const jwt = require('jsonwebtoken');
const User = require('../models/User');

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  const c = req.cookies || {};
  return c.token || c.jwt || c.accessToken || c.authToken || c.bearer || null;
}

function getUserIdFromPayload(decoded) {
  return decoded?.id || decoded?._id || decoded?.userId || decoded?.uid || null;
}

async function ensureAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    // <-- ключевой фикс: одинаковый секрет и fallback
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');

    const uid = getUserIdFromPayload(decoded);
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(uid).lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { ensureAuth };