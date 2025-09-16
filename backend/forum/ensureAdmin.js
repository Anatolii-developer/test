module.exports = function ensureAdmin(req, res, next){
  const roles = (req.user?.roles || []).map(r => String(r).toLowerCase());
  if (roles.includes('admin')) return next();
  return res.status(403).json({ message: 'Admin only' });
};