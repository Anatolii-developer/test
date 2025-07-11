const express = require('express');
const router = express.Router();
const { createCourse, getCourses, getCourseById, updateCourse, approveCourse} = require('../controllers/courseController');

router.post('/', createCourse);
router.get('/', getCourses);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.put('/:id/approve', approveCourse)
router.get('/:id/participants', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('participants');
    if (!course) return res.status(404).json({ message: "Курс не знайдено" });
    res.json(course.participants);
  } catch (err) {
    res.status(500).json({ message: "Помилка сервера" });
  }
});



module.exports = router;
