const express = require('express');
const router = express.Router();
const { createCourse, getCourses, getCourseById, updateCourse, approveCourse, getCurrentCourseParticipants} = require('../controllers/courseController');

router.post('/', createCourse);
router.get('/', getCourses);
router.get('/:id/participants', getCourseParticipants);
router.get('/current-course-participants', getCurrentCourseParticipants);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.put('/:id/approve', approveCourse)
const { getCourseParticipants } = require('../controllers/courseController');


    


module.exports = router;
