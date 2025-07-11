const express = require('express');
const router = express.Router();
const { createCourse, getCourses, getCourseById, updateCourse, approveCourse} = require('../controllers/courseController');

router.post('/', createCourse);
router.get('/', getCourses);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.put('/:id/approve', approveCourse)
const { getCourseParticipants } = require('../controllers/courseController');
router.get('/:id/participants', getCourseParticipants);

    


module.exports = router;
