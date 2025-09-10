// backend/forum/authz.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function extractToken(req) {
  // 1) Authorization: Bearer
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.slice(7).trim();
  }

  // 2) Куки — попробуем известные имена
  const c = req.cookies || {};
  const known =
    c.token || c.jwt || c.accessToken || c.authToken || c.bearer;
  if (known) return known;

  // 3) Фолбэк: найдём любую куку, похожую на JWT (3 части через точку)
  for (const v of Object.values(c)) {
    if (typeof v === 'string' && v.split('.').length === 3) {
      return v;
    }
  }
  return null;
}

function getUserIdFromPayload(decoded) {
  return decoded?.id || decoded?._id || decoded?.userId || decoded?.uid || null;
}

async function ensureAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const uid = getUserIdFromPayload(decoded);
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(uid).lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    req.user = user;
    next();
  } catch (e) {
    // console.warn('[forum] ensureAuth error:', e?.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { ensureAuth };