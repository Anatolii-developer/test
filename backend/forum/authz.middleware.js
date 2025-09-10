// backend/forum/authz.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // путь от папки forum к моделям

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (h && typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.slice(7).trim();
  }
  // запасной вариант — токен в куке
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

async function ensureAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded._id).lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { ensureAuth };