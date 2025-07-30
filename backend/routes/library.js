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
router.post("/api/library", upload.single("bookFile"), async (req, res) => {
  try {
    const { type, title, description, videoLink } = req.body;

    const newItem = {
      type,
      title,
      description,
      date: new Date(),
    };

    if (type === "video") {
      newItem.videoLink = videoLink;
    } else if (req.file) {
      newItem.filePath = req.file.path.replace(/\\/g, "/"); // cross-platform fix
    }

    const saved = await Library.create(newItem);
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Помилка при створенні матеріалу:", err);
    res.status(500).send("Server error");
  }
});

// 📤 GET /api/library
router.get("/api/library", async (req, res) => {
  try {
    const all = await Library.find().sort({ date: -1 });
    res.json(all);
  } catch (err) {
    console.error("❌ Помилка при завантаженні:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
