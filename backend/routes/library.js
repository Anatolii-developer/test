const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Library = require("../models/LibraryModel");

// Проверка и создание папки, если её нет
const uploadPath = path.join(__dirname, "..", "uploads", "books");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer конфигурация
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 📥 POST /api/library
router.post("/", upload.single("bookFile"), async (req, res) => {
  try {
    const { type, title, description, videoLink, destination, courseId } = req.body;

    const newItem = {
      type,
      title,
      description,
      date: new Date(),
      destination: destination || "general" // fallback на загальні
    };

    if (type === "video") {
      newItem.videoLink = videoLink;
    } else if (req.file) {
      newItem.filePath = req.file.path.replace(/\\/g, "/");
    }

    if (destination === "courses" && courseId) {
      newItem.courseId = courseId;
    }

    const saved = await Library.create(newItem);
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Помилка при створенні матеріалу:", err);
    res.status(500).send("Server error");
  }
});


// 📤 GET /api/library
router.get("/", async (req, res) => {
  try {
    const { destination, courseId } = req.query;

    const query = {};
    if (destination) query.destination = destination;
    if (courseId) query.courseId = courseId;

    const all = await Library.find(query).sort({ date: -1 });
    res.json(all);
  } catch (err) {
    console.error("❌ Помилка при завантаженні:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
