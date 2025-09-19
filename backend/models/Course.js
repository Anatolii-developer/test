const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorName: String,
  creatorRole: String,
  mainType: {
    type: String,
    enum: ['Курс', 'Підвищення кваліфікації', 'Конференція'],
    required: true
  },
  formatType: {
    type: String,
    enum: ['Група', 'Супервізія', 'Лекція', 'Семінар', null],
    default: null
  },
  courseTitle: String,
  courseSubtitle: String,
  courseDescription: String,
  courseDates: {
    start: Date,
    end: Date
  },
  courseDays: [String], // ['Понеділок', 'Середа', ...]
  courseTime: {
    start: String,
    end: String
  },
  status: {
  type: String,
  enum: ['WAITING_FOR_APPROVAL', 'Запланований', 'Поточний', 'Пройдений'],
  default: 'WAITING_FOR_APPROVAL'
},

  accessType: String, // Відкрита група / Закрита група
  closedGroupMembers: [String],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  courseDuration: String,
  coursePrice: String,
  zoomLink: String,
  siteLink: String,  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
