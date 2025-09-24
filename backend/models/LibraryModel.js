// backend/models/Library.js
const mongoose = require("mongoose");

const librarySchema = new mongoose.Schema({
  type: { type: String, enum: ["video", "book"], required: true },
  title: String,
  description: String,
  videoLink: String,
  filePath: String,
  mime: String,
  date: { type: Date, default: Date.now },

  destination: { type: String, enum: ["general", "addons", "courses"], required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

  role: String,

  folder: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Library", librarySchema);