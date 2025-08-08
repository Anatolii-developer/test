const express = require('express');
const router = express.Router();
const career = require('../controllers/careerApplicationsController');

router.post('/', career.create); // не вызываем!
router.get('/', career.list);

module.exports = router;