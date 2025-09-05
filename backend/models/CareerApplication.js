// models/CareerApplication.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const CareerApplicationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, index: true },
  fullName: String,
  email: String,

  target: {
    type: String,
    enum: ['mentor', 'supervisor'],
    required: true
  },

  experience: String,
  ageGroup: String,
  requestText: String,
  aboutText: String,

  assignedMentor: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = model('CareerApplication', CareerApplicationSchema);