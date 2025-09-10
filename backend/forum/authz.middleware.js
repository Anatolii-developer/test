// server/forum/authz.middleware.js
function ensureAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

module.exports = { ensureAuth };