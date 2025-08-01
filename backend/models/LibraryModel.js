const librarySchema = new mongoose.Schema({
  type: String, // 'video' or 'book'
  title: String,
  description: String,
  videoLink: String,
  filePath: String,
  date: Date,
  destination: String, // 'general', 'addons', 'courses'
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },
  role: String // ← Додай це
});
