
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/careerFaqController');


function isAdmin(req, res, next) {
  if (process.env.ALLOW_FAQ_DEV === '1') return next();
  const role = (req.user?.role || req.user?.roles || '').toString().toLowerCase();
  if (role.includes('admin')) return next();
  return res.status(403).json({ message: 'Forbidden: admin only' });
}

router.get('/', ctrl.listPublic);

router.get('/admin', isAdmin, ctrl.listAdmin);
router.post('/', isAdmin, ctrl.create);
router.put('/reorder', isAdmin, ctrl.reorder);
router.put('/:id', isAdmin, ctrl.update);
router.delete('/:id', isAdmin, ctrl.remove);


module.exports = router;