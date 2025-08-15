
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/careerFaqController');


function isAdmin(req, res, next) {
  const role = (req.user?.role || req.user?.roles || '').toString().toLowerCase();
  if (role.includes('admin')) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

router.get('/', ctrl.listPublic);

router.get('/admin', isAdmin, ctrl.listAdmin);
router.post('/', isAdmin, ctrl.create);
router.put('/:id', isAdmin, ctrl.update);
router.delete('/:id', isAdmin, ctrl.remove);

module.exports = router;