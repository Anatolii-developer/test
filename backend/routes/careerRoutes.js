const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// ⚠️ правильный контроллер
const careerCtrl = require('../controllers/careerApplicationsController');

// тот же auth, что и в userRoutes
function auth(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (!token) return res.status(401).json({ ok:false, message:'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = { _id: payload.id, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, message:'Invalid token' });
  }
}

// POST можно оставить открытым (как у вас), а список — только для авторизованных
router.post('/', careerCtrl.create);
router.get('/', auth, careerCtrl.list);

module.exports = router;