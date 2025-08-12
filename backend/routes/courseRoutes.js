const express = require('express');
const router = express.Router();

const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  approveCourse,
  getCourseParticipants,
  getCurrentCourseParticipants
} = require('../controllers/courseController');

// Спочатку специфічні
router.get('/current-course-participants', getCurrentCourseParticipants);
router.get('/:id/participants', getCourseParticipants);
router.put('/:id/approve', approveCourse);

// Потім загальні
router.get('/:id', getCourseById);
router.get('/', getCourses);
router.post('/', createCourse);
router.put('/:id', updateCourse);

module.exports = router;
