// authz.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALGS = (process.env.JWT_ALGS || 'HS256').split(',').map(s => s.trim());

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  const c = req.cookies || {};
  return c.token || c.jwt || c.accessToken || c.authToken || c.bearer || null;
}

const token = jwt.sign(
  { id: String(user._id) },           // <= ВАЖНО: поле "id"
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '7d' }
);
res.cookie('token', token, { httpOnly:true, sameSite:'lax', secure:false, path:'/', maxAge:7*24*60*60*1000 });
res.json({ user, token });            // и верни token в ответе

async function ensureAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT secret missing');

    const decoded = jwt.verify(token, secret, { algorithms: ALGS, clockTolerance: 5 });
    const uid = getUserIdFromPayload(decoded);
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(uid).lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    req.user = user;
    req.auth = decoded;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { ensureAuth, extractToken, getUserIdFromPayload };