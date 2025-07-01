const express = require('express');
const router = express.Router();
const { createCourse, getCourses, getCourseById, updateCourse } = require('../controllers/courseController');

router.post('/', createCourse);
router.get('/', getCourses);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);

module.exports = router;
