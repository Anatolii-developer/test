const { Schema, model, Types } = require('mongoose');

const careerApplicationSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: false },
  fullName: String,
  email: String,
  experience: String,
  ageGroup: String,
  requestText: String,
  aboutText: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('CareerApplication', careerApplicationSchema);