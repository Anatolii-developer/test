const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  eventType: String, // Курс, Група, Супервізія, Лекція, Семінар
  courseTitle: String,
  courseSubtitle: String,
  courseDescription: String,
  courseDates: {
    start: Date,
    end: Date
  },
  courseDays: [String], // ['Понеділок', 'Середа', ...]
  courseTime: {
    start: String, // e.g. "17:00"
    end: String    // e.g. "18:00"
  },
  accessType: String, // Відкрита група / Закрита група
  closedGroupMembers: [String], // optional user IDs
  courseDuration: String,
  coursePrice: String,
  zoomLink: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
