const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// models/CareerApplication.js
const CareerApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, index: true },
  fullName: String,
  email: String,
  experience: String,
  ageGroup: String,
  requestText: String,
  aboutText: String,
  assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // 👈 новое поле
}, { timestamps:true });

module.exports = model('CareerApplication', CareerApplicationSchema);