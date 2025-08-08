// models/CareerApplication.js
const { Schema, model, Types } = require('mongoose');

const careerApplicationSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User' }, // можно без required, чтобы не падали старые данные
  // бэкапные поля — чтобы показывать имя даже если user не проставлен
  fullName: String,
  email: String,

  experience: String,
  ageGroup: String,
  requestText: String,
  aboutText: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('CareerApplication', careerApplicationSchema);