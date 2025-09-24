// backend/routes/libraryRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Library = require("../models/LibraryModel");

// === upload dir (публичная папка!) ===
const uploadDir = path.join(__dirname, "../public/uploads/books");
fs.mkdirSync(uploadDir, { recursive: true });

// === Multer: имя файла + фильтр расширений ===
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const base = path
      .basename(file.originalname)
      .replace(/[^\w.\-]+/g, "_"); // слегка обезопасим
    cb(null, Date.now() + "-" + base);
  },
});

const ALLOWED_EXT = /\.(pdf|doc|docx|ppt|pptx)$/i;
const fileFilter = (_req, file, cb) => {
  // иногда mime пустой, поэтому проверим и имя, и mime
  if (ALLOWED_EXT.test(file.originalname)) return cb(null, true);
  return cb(new Error("Only PDF/DOC/DOCX/PPT/PPTX allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ---------- CREATE ----------
router.post("/", upload.single("bookFile"), async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      videoLink,
      destination,
      courseId,
      role,
      section,
    } = req.body;

    const doc = {
      type,
      title,
      description,
      destination,
      section: section?.trim() || "", // «папка»
    };

    if (destination === "courses" && courseId) doc.courseId = courseId;
    if (destination === "addons" && role) doc.role = role;

    if (type === "video") {
      if (!videoLink) return res.status(400).json({ message: "videoLink required" });
      doc.videoLink = videoLink;
    } else {
      // файл обязателен для book
      if (!req.file) return res.status(400).json({ message: "file required" });
      // сохраняем ВЕБ-путь
      doc.filePath = `/uploads/books/${req.file.filename}`;
    }

    const saved = await Library.create(doc);
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Create library item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- LIST ----------
router.get("/", async (req, res) => {
  try {
    const { destination, courseId, section, role } = req.query;
    const q = {};
    if (destination) q.destination = destination;
    if (courseId) q.courseId = courseId;
    if (section) q.section = section;
    if (role) q.role = role;

    const items = await Library.find(q).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error("❌ Get library items:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- DISTINCT SECTIONS (для выпадашек по курсу) ----------
router.get("/sections", async (req, res) => {
  try {
    const { courseId } = req.query;
    const match = { destination: "courses" };
    if (courseId) match.courseId = courseId;

    const sections = await Library.distinct("section", match);
    res.json(sections.filter(Boolean)); // без пустых
  } catch (err) {
    console.error("❌ List sections:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- READ ONE ----------
router.get("/:id", async (req, res) => {
  try {
    const item = await Library.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- UPDATE ----------
router.put("/:id", upload.single("bookFile"), async (req, res) => {
  try {
    const { title, description, videoLink, section, role } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (section !== undefined) update.section = section;
    if (role !== undefined) update.role = role;

    if (req.file) {
      update.filePath = `/uploads/books/${req.file.filename}`;
    }
    if (videoLink !== undefined) update.videoLink = videoLink;

    const item = await Library.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("❌ Update library item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- DELETE ----------
router.delete("/:id", async (req, res) => {
  try {
    const item = await Library.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;