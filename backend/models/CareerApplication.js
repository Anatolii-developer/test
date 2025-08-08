// backend/models/CareerApplication.js
const mongoose = require("mongoose");

const CareerApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // если есть сессии
    fullName: String, // на случай без авторизации
    email: String,
    experience: { type: String, enum: ["<7", "7-15", "15+"] },
    ageGroup: { type: String }, // "до 32", "32-42", ...
    requestText: { type: String },
    aboutText: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CareerApplication", CareerApplicationSchema);