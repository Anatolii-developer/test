const mongoose = require('mongoose');

// 👇 Хто брав участь у конкретному юніті, і в якій ролі
const unitMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mode: {
      type: String,
      enum: ['проходив', 'проводив'], // важливо для статистики
      required: true,
    },
  },
  { _id: false }
);

// 👇 Окреме заняття / сесія / супервізія в рамках курсу
const unitSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true, // день, коли відбувся юніт
    },
    startTime: {
      type: String, // '10:00'
    },
    endTime: {
      type: String, // '12:00'
    },
    unitType: {
      type: String,
      enum: [
        'Особистий аналіз',
        'Індивідуальна супервізія',
        'Групова супервізія',
        'Менторське заняття',
        'Лекція',
        'Семінар',
        'Терапевтична група',
        'Супервізійно-семінарське заняття',
        'Парна терапія',
        'Лекторій',
      ],
      required: true,
    },
    // Опціонально: відображення на таймлайні / внутрішня назва
    title: {
      type: String,
    },
    // Скільки годин/одиниць зарахувати (для витягу по практиці)
    hours: {
      type: Number, // наприклад 1.5
    },
    // Хто в юніті, з розподілом "проходив" / "проводив"
    members: [unitMemberSchema],
  },
  { _id: true } // кожен юніт має свій id
);

const courseSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorName: String,
  creatorRole: String,
  mainType: {
    type: String,
    enum: ['Курс', 'Підвищення кваліфікації', 'Конференція'],
    required: true,
  },
  formatType: {
    type: String,
    enum: ['Група', 'Супервізія', 'Лекція', 'Семінар', null],
    default: null,
  },
  courseTitle: String,
  courseSubtitle: String,
  courseDescription: String,
  courseDates: {
    start: Date,
    end: Date,
  },
  courseDays: [String],
  courseTime: {
    start: String,
    end: String,
  },
  status: {
    type: String,
    enum: ['WAITING_FOR_APPROVAL', 'Запланований', 'Поточний', 'Пройдений'],
    default: 'WAITING_FOR_APPROVAL',
  },

  accessType: String,
  closedGroupMembers: [String],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  courseDuration: String,
  coursePrice: String,
  zoomLink: String,
  siteLink: String,

  // 👇 НОВЕ: масив юнітів (занять / сесій) в рамках курсу
  units: [unitSchema],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Course', courseSchema);