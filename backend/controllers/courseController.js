const Course = require('../models/Course');

// POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const startRaw = req.body.courseDates?.start || req.body.startDate;
    const endRaw   = req.body.courseDates?.end   || req.body.endDate;

    if (!startRaw || !endRaw) {
      return res.status(400).json({ message: 'Вкажіть дати початку і завершення курсу' });
    }

    const startDate = new Date(`${startRaw}T00:00:00Z`);
    const endDate   = new Date(`${endRaw}T23:59:59Z`);
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Некоректний формат дат' });
    }

    const timeStart = req.body.courseTime?.start || req.body.startTime || '';
    const timeEnd   = req.body.courseTime?.end   || req.body.endTime   || '';

    // 👇 Нормалізуємо юніти, якщо вони прийшли з фронта
    let units = [];
    if (Array.isArray(req.body.units)) {
      units = req.body.units
        .map((u) => {
          const unitDateRaw = u.date || null;
          const unitDate = unitDateRaw ? new Date(unitDateRaw) : null;
          const hoursNumber =
            typeof u.hours === 'number'
              ? u.hours
              : typeof u.hours === 'string' && u.hours.trim() !== ''
                ? Number(u.hours)
                : null;

          return {
            dayName: u.dayName || u.day || null, // Понеділок, Вівторок тощо
            date: unitDate && !isNaN(unitDate) ? unitDate : null,
            startTime: u.startTime || '',
            endTime: u.endTime || '',
            unitType: u.unitType, // 'Лекція', 'Семінар' тощо
            title: u.title || '',
            hours: Number.isFinite(hoursNumber) ? hoursNumber : null,
            members: Array.isArray(u.members)
              ? u.members
                  .filter((m) => m && m.user && m.mode)
                  .map((m) => ({
                    user: m.user,
                    mode: m.mode === 'проводив' ? 'проводив' : 'проходив', // захист від некоректних значень
                  }))
              : [],
          };
        })
        .filter((u) => (u.dayName || u.date) && u.unitType); // відкидаємо порожні/некоректні юніти
    }

    const mainType = req.body.mainType || req.body.eventType || null;
    const formatTypeRaw = req.body.formatType ?? null;
    const formatType = formatTypeRaw === '' ? null : formatTypeRaw;
    const formatDetailsSource = Array.isArray(req.body.formatDetails)
      ? req.body.formatDetails
      : typeof req.body.formatDetails === 'string' && req.body.formatDetails.trim() !== ''
        ? [req.body.formatDetails]
        : [];
    const formatDetails = Array.from(
      new Set(
        formatDetailsSource
          .filter((v) => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean)
      )
    );

    if (!mainType) {
      return res.status(400).json({ message: 'Вкажіть головний вид курсу' });
    }

    const course = new Course({
      creatorId:   req.body.creatorId || null,
      creatorName: req.body.creatorName || '',
      creatorRole: req.body.creatorRole || '',
      mainType,
      formatType,
      formatDetails,
      courseTitle: req.body.courseTitle,
      courseSubtitle: req.body.courseSubtitle,
      courseDescription: req.body.courseDescription,
      courseDates: { start: startDate, end: endDate },
      courseDays: Array.isArray(req.body.courseDays) ? req.body.courseDays : [],
      courseTime: { start: timeStart, end: timeEnd },
      accessType: req.body.accessType,
      closedGroupMembers: req.body.closedGroupMembers || [],
      participants: req.body.participants || [],
      courseDuration: req.body.courseDuration,
      coursePrice: req.body.coursePrice,
      zoomLink: req.body.zoomLink,
      siteLink:
        req.body.siteLink ||
        req.body.publicUrl ||
        req.body.pageUrl ||
        req.body.website ||
        req.body.websiteUrl ||
        '',
      status: 'WAITING_FOR_APPROVAL',

      // 🔥 Нове поле: масив юнітів (занять / сесій) в рамках курсу
      units,
    });

    await course.save();
    return res.status(201).json({ success: true, course });
  } catch (err) {
    console.error('❌ Error creating course:', err);
    return res.status(500).json({ message: 'Помилка при створенні курсу', error: err.message });
  }
};

// PUT /api/courses/:id/approve
exports.approveCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Курс не знайдено" });

    const now = new Date();
    const hasDates = course.courseDates && course.courseDates.start && course.courseDates.end;
    const start = hasDates ? new Date(course.courseDates.start) : null;
    const end   = hasDates ? new Date(course.courseDates.end)   : null;

    let newStatus = course.status || "WAITING_FOR_APPROVAL";
    if (start && end) {
      if (now >= start && now <= end) newStatus = "Поточний";
      else if (now > end)             newStatus = "Пройдений";
      else                            newStatus = "Запланований";
    }

    // Обновляем точечно без триггера полной валидации
    await Course.updateOne({ _id: course._id }, { $set: { status: newStatus } }, { runValidators: false });
    course.status = newStatus; // чтобы вернуть актуальный статус

    res.json({ success: true, course });
  } catch (err) {
    console.error("❌ Error approving course:", err.message);
    res.status(500).json({ message: "Помилка при підтвердженні курсу", error: err.message });
  }
};


exports.getCourses = async (req, res) => {
  try {
    const { mainType, formatType, status } = req.query;
    const q = {};
    if (mainType)   q.mainType = mainType;
    if (formatType) q.formatType = formatType;
    if (status)     q.status = status;

    const courses = await Course.find(q)
      .populate('creatorId', 'firstName lastName fullName email role roles')
      .sort({ createdAt: -1 });

    const now = new Date();

    const updatedCourses = await Promise.all(
      courses.map(async (course) => {
        const hasDates = course.courseDates && course.courseDates.start && course.courseDates.end;
        const start = hasDates ? new Date(course.courseDates.start) : null;
        const end   = hasDates ? new Date(course.courseDates.end)   : null;

        let newStatus = course.status || "WAITING_FOR_APPROVAL";
        if (start && end) {
          if (now >= start && now <= end) newStatus = "Поточний";
          else if (now > end)             newStatus = "Пройдений";
          else                            newStatus = "Запланований";
        }

        // Обновляем статус точечно, без полной валидации документа
        if (course.status !== 'WAITING_FOR_APPROVAL' && course.status !== newStatus) {
          await Course.updateOne(
            { _id: course._id },
            { $set: { status: newStatus } },
            { runValidators: false }
          );
          course.status = newStatus; // синхронизируем в объекте ответа
        }

        // Автоматическое заполнение имени и роли по creatorId
        if ((!course.creatorName || course.creatorName === '') && course.creatorId) {
          const fn = [course.creatorId.firstName, course.creatorId.lastName].filter(Boolean).join(' ');
          course.creatorName = fn || course.creatorId.email || '';
        }
        if ((!course.creatorRole || course.creatorRole === '') && course.creatorId) {
          course.creatorRole = course.creatorId.role || '';
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
      .populate('creatorId', 'firstName lastName email role')
      .populate('participants', 'fullName email');

    if (!course) return res.status(404).json({ message: "Курс не знайдено" });

    const now = new Date();
    const hasDates = course.courseDates && course.courseDates.start && course.courseDates.end;
    const start = hasDates ? new Date(course.courseDates.start) : null;
    const end   = hasDates ? new Date(course.courseDates.end)   : null;

    let newStatus = course.status || 'WAITING_FOR_APPROVAL';
    if (start && end) {
      if (now >= start && now <= end) newStatus = 'Поточний';
      else if (now > end)             newStatus = 'Пройдений';
      else                            newStatus = 'Запланований';
    }

    if (course.status !== newStatus) {
      await Course.updateOne(
        { _id: course._id },
        { $set: { status: newStatus } },
        { runValidators: false }
      );
      course.status = newStatus;
    }

    if ((!course.creatorName || course.creatorName === '') && course.creatorId) {
      const fn = [course.creatorId.firstName, course.creatorId.lastName].filter(Boolean).join(' ');
      course.creatorName = fn || course.creatorId.email || course.creatorName || '';
    }
    if ((!course.creatorRole || course.creatorRole === '') && course.creatorId) {
      course.creatorRole = course.creatorId.role || course.creatorRole || '';
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні курсу", error: error.message });
  }
};


exports.updateCourse = async (req, res) => {
  try {
    // Нормалізуємо дати, якщо прийшли як courseDates: { start, end }
    if (req.body.courseDates) {
      const s = req.body.courseDates.start;
      const e = req.body.courseDates.end;
      if (s) req.body['courseDates.start'] = new Date(s).toISOString();
      if (e) req.body['courseDates.end']   = new Date(e).toISOString();
      delete req.body.courseDates; // для findByIdAndUpdate використовуємо dot-notation
    }

    // Приймаємо siteLink з будь-якого з відомих псевдонімів
    if (!req.body.siteLink) {
      const alias = req.body.publicUrl || req.body.pageUrl || req.body.website || req.body.websiteUrl;
      if (alias) req.body.siteLink = alias;
    }

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Курс не знайдено" });
    res.json(updated);
  } catch (err) {
    console.error("Помилка при оновленні курсу:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};


exports.getCourseParticipants = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('participants');
    if (!course) return res.status(404).json({ message: "Курс не знайдено" });
    res.json(course.participants);
  } catch (err) {
    console.error("❌ Error fetching participants:", err.message);
    res.status(500).json({ message: "Помилка сервера", error: err.message });
  }
};

// DELETE /api/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Курс не знайдено" });
    res.json({ success: true });
  } catch (err) {
    console.error("Помилка при видаленні курсу:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
exports.getCurrentCourseParticipants = async (req, res) => {
  try {
    const currentCourses = await Course.find({ status: 'Поточний' }).populate('participants');

    const participantsMap = new Map();

    currentCourses.forEach(course => {
      course.participants.forEach(user => {
        if (!participantsMap.has(user._id.toString())) {
          participantsMap.set(user._id.toString(), user);
        }
      });
    });

    const uniqueParticipants = Array.from(participantsMap.values());

    res.json(uniqueParticipants);
  } catch (err) {
    console.error("❌ Error fetching current course participants:", err.message);
    res.status(500).json({ message: "Помилка сервера", error: err.message });
  }
};
