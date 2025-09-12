// authz.optional.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALGS = (process.env.JWT_ALGS || 'HS256').split(',').map(s=>s.trim());

function extractToken(req){
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  const c = req.cookies || {};
  return c.token || c.jwt || c.accessToken || c.authToken || c.bearer || null;
}
function getUserIdFromPayload(d){ return d?.id || d?._id || d?.userId || d?.uid || null; }

async function optionalAuth(req, _res, next){
  try {
    const token = extractToken(req);
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) return next();
    const decoded = jwt.verify(token, secret, { algorithms: ALGS, clockTolerance: 5 });
    const uid = getUserIdFromPayload(decoded);
    if (!uid) return next();
    const user = await User.findById(uid).lean();
    if (user) { req.user = user; req.auth = decoded; }
  } catch(_){}
  next();
}

module.exports = { optionalAuth };