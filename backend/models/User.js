const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
  role: String, // добавлено
  status: { type: String, default: "WAIT FOR REVIEW" },
  createdAt: { type: Date, default: Date.now },
});

// хеширование пароля перед сохранением
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", userSchema);
