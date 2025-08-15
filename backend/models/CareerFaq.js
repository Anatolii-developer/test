const mongoose = require('mongoose');

const careerFaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer:   { type: String, required: true, trim: true },
    order:    { type: Number, default: 0 },   // для сортировки
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerFaq', careerFaqSchema);