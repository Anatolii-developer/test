const mongoose = require("mongoose");

const librarySchema = new mongoose.Schema({
  type: { type: String, enum: ["video", "book"], required: true },
  title: String,
  description: String,
  videoLink: String,
  filePath: String,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Library", librarySchema);
