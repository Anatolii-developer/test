const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const careerCtrl = require('../controllers/careerController');

// простенька auth-функція без middleware файла
function auth(req, res, next) {
  const token = (req.cookies?.token) || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok:false, message:'Unauthorized' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = { _id: p.id, role: p.role, email: p.email, username: p.username };
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, message:'Invalid token' });
  }
}

// користувач/ментор
router.get('/', auth, careerCtrl.list);
// адмін
router.get('/admin', auth, careerCtrl.listAdmin);
// створити
router.post('/', auth, careerCtrl.create);
// призначити
router.put('/:id/assign', auth, careerCtrl.assignMentor);

module.exports = router;