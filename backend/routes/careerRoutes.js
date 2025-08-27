const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const careerCtrl = require('../controllers/careerController');

// auth без отдельного middleware-файла
function auth(req, res, next) {
  const token = (req.cookies?.token) || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok:false, message:'Unauthorized' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    // ⚠️ важно прокинуть массив ролей
    req.user = {
      _id: p.id || p._id,
      id:  p.id || p._id,
      roles: Array.isArray(p.roles) ? p.roles : (p.role ? [p.role] : []),
      email: p.email,
      username: p.username
    };
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, message:'Invalid token' });
  }
}

// маленький гард для админа
function adminOnly(req, res, next){
  const roles = (req.user?.roles || []).map(r => String(r).toLowerCase());
  if (roles.some(r => r.includes('admin') || r.includes('адмін'))) return next();
  return res.status(403).json({ ok:false, message:'Forbidden: admin only' });
}

// ✅ один GET, который сам решает — обычный список или админский
router.get('/', auth, (req, res) => {
  if (String(req.query.all) === '1') return careerCtrl.listAdmin(req, res);
  return careerCtrl.list(req, res);
});

// создать заявку
router.post('/', auth, careerCtrl.create);

// назначить ментора — только админ
router.put('/:id/assign', auth, adminOnly, careerCtrl.assignMentor);

module.exports = router;