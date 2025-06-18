const Course = require('../models/Course');

// POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json({ message: "Курс створено", course });
  } catch (error) {
    console.error("❌ Error creating course:", error);
    res.status(500).json({ message: "Помилка при створенні курсу" });
  }
};

// GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні курсів" });
  }
};
