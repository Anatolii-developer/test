const Course = require('../models/Course');

// POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    console.log("📥 New course request:", req.body); // добавьте это

    const course = new Course(req.body);
    await course.save();

    res.status(201).json({ success: true, message: "Курс створено", course });
  } catch (error) {
    console.error("❌ Error creating course:", error.message);
    res.status(500).json({ message: "Помилка при створенні курсу", error: error.message });
  }
};


// GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("❌ Error fetching courses:", error.message, error.stack);
    res.status(500).json({ message: "Помилка при отриманні курсів", error: error.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('participants', 'fullName email'); // Тільки потрібні поля

    if (!course) return res.status(404).json({ message: "Курс не знайдено" });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні курсу", error: error.message });
  }
};


