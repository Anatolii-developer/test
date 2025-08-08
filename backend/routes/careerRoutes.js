const express = require('express');
const router = express.Router();
const careerCtrl = require('../controllers/careerController'); 

router.post('/', careerCtrl.create); // передаём функцию, НЕ вызываем
router.get('/', careerCtrl.list);

module.exports = router;