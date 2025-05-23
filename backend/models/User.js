const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  firstName: String,
  lastName: String,
  middleName: String,
  dateOfBirth: String,
  email: String,
  phone: String,
  gender: String,
  experience: String,
  education: String,
  directions: [String],
  topics: [String],
  role: String, // ✅ добавь это
  status: { type: String, default: "WAIT FOR REVIEW" },
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("User", userSchema);
