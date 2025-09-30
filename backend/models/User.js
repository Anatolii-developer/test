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
  photoUrl: String,  // ➕ ссылка на фото
  about: String,
  courses: String,
  cost: String,
  videoLink: String,
  qualifications: String,
  experienceExtra: String,
  language: String,
  format: [String],     
  city: String,         
  lectures: String,                   // ➕ новое
  seminars: String,                   // ➕ новое
  colloquiums: String,                // ➕ новое
  groupExperience: String,            // ➕ новое
  personalTherapy: String,            // ➕ новое
  personalAnalysis: String,           // ➕ новое
  individualSupervision: String,      // ➕ новое
  mentoring: String,                  // ➕ новое
  groupSupervision: String,           // ➕ новое
  psychoanalyticPsychodrama: String,  // ➕ новое
  teachingSchool: String,             // ➕ новое
  teachingUniversity: String,         // ➕ новое
  professionalInstitutes: String,     // ➕ новое
  communityOrganizations: String,     // ➕ новое
  therapyGroups: String,              // ➕ новое
  crisisGroups: String,               // ➕ новое
  psychoanalyticDramaGroups: String,  // ➕ новое
  roles: [{ type: String }],
  status: { type: String, default: "WAIT FOR REVIEW" },
  createdAt: { type: Date, default: Date.now },
forumBlocked: { type: Boolean, default: false },   // полный бан форума
forumMutedUntil: { type: Date, default: null },    // мут (до даты); null = нет мута
recoveryCode: { type: String, default: null },
  recoveryCodeExpires: { type: Date, default: null },
});

// хеширование пароля перед сохранением
userSchema.pre("save", async function (next) {
if (!this.isModified("password")) return next();
this.password = await bcrypt.hash(this.password, 10);
next();
});


userSchema.add({
  certificates: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});




module.exports = mongoose.model("User", userSchema);
