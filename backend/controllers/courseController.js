const Course = require('../models/Course');

// POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const { courseDates } = req.body;

    const startDate = new Date(`${courseDates.start}T00:00:00`);
    const endDate = new Date(`${courseDates.end}T23:59:59`);
    const now = new Date();

    let status = "Запланований";
    if (now >= startDate && now <= endDate) status = "Поточний";
    else if (now > endDate) status = "Пройдений";

    const course = new Course({
      ...req.body,
      courseDates: {
        start: startDate,
        end: endDate,
      },
      status
    });

    await course.save();
    res.status(201).json({ success: true, course });

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: "Помилка при створенні курсу", error: err.message });
  }
};



// GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });

    const now = new Date();

    // Обновляем статус каждого курса перед отправкой
    const updatedCourses = await Promise.all(
      courses.map(async (course) => {
        const start = new Date(course.courseDates.start);
        const end = new Date(course.courseDates.end);

        let newStatus = "Запланований";
        if (now >= start && now <= end) {
          newStatus = "Поточний";
        } else if (now > end) {
          newStatus = "Пройдений";
        }

        // Если статус отличается — обновляем в базе
        if (course.status !== newStatus) {
          course.status = newStatus;
          await course.save(); // сохраняем изменение в MongoDB
        }

        return course;
      })
    );

    res.json(updatedCourses);
  } catch (error) {
    console.error("❌ Error fetching courses:", error.message, error.stack);
    res.status(500).json({ message: "Помилка при отриманні курсів", error: error.message });
  }
};


exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('participants', 'fullName email');

    if (!course) return res.status(404).json({ message: "Курс не знайдено" });

    // 🟡 Пересчитываем статус
    const now = new Date();
    const start = new Date(course.courseDates.start);
    const end = new Date(course.courseDates.end);

    let newStatus = "Запланований";
    if (now >= start && now <= end) {
      newStatus = "Поточний";
    } else if (now > end) {
      newStatus = "Пройдений";
    }

    // 🟡 Если статус отличается — обновляем в базе
    if (course.status !== newStatus) {
      course.status = newStatus;
      await course.save();
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні курсу", error: error.message });
  }
};


// PUT /api/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCourse) return res.status(404).json({ message: "Курс не знайдено" });
    res.json(updatedCourse);
  } catch (err) {
    console.error("Помилка при оновленні курсу:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

