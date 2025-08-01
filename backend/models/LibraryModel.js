const mongoose = require("mongoose");

const librarySchema = new mongoose.Schema({
  type: String, // 'video' or 'book'
  title: String,
  description: String,
  videoLink: String,
  filePath: String,
  date: Date,
  destination: String, // 'general', 'addons', 'courses'
  courseId: String,    // Якщо destination === 'courses'
});

module.exports = mongoose.model("Library", librarySchema);
