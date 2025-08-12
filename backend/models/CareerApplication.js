const { Schema, model, Types } = require('mongoose');

// models/CareerApplication.js
const CareerApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, index: true }, // 👈
  fullName: String,
  email: String,
  experience: String,
  ageGroup: String,
  requestText: String,
  aboutText: String,
}, { timestamps:true });

module.exports = model('CareerApplication', CareerApplicationSchema);