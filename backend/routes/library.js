// backend/routes/libraryRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ВАЖНО: используем ту модель, где есть поле `folder`
const Library = require("../models/LibraryModel"); // ← было ../models/LibraryModel

// === upload dir (публичная папка!) ===
const uploadDir = path.join(__dirname, "../public/uploads/books");
fs.mkdirSync(uploadDir, { recursive: true });

// === Multer: имя файла + фильтр расширений ===
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const base = path.basename(file.originalname).replace(/[^\w.\-]+/g, "_");
    cb(null, Date.now() + "-" + base);
  },
});

const ALLOWED_EXT = /\.(pdf|doc|docx|ppt|pptx)$/i;
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_EXT.test(file.originalname)) return cb(null, true);
  return cb(new Error("Only PDF/DOC/DOCX/PPT/PPTX allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
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
      folder,          // ← читаем folder (а не section)
    } = req.body;

    if (!type || !["video", "book"].includes(type)) {
      return res.status(400).json({ message: "type must be 'video' or 'book'" });
    }
    if (!destination || !["general", "addons", "courses"].includes(destination)) {
      return res.status(400).json({ message: "Invalid destination" });
    }
    if (destination === "courses" && !courseId) {
      return res.status(400).json({ message: "courseId is required for destination=courses" });
    }

    const doc = {
      type,
      title,
      description,
      destination,
      folder: (folder || "").trim(), // ← сохраняем ИМЕННО в folder
    };

    if (destination === "courses" && courseId) doc.courseId = courseId;
    if (destination === "addons" && role) doc.role = role;

    if (type === "video") {
      if (!videoLink) return res.status(400).json({ message: "videoLink required" });
      doc.videoLink = videoLink;
    } else {
      if (!req.file) return res.status(400).json({ message: "file required" });
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
    const { destination, courseId, folder, role } = req.query; // ← folder вместо section
    const q = {};
    if (destination) q.destination = destination;
    if (courseId) q.courseId = courseId;
    if (folder) q.folder = folder;
    if (role) q.role = role;

    const items = await Library.find(q).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error("❌ Get library items:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- DISTINCT FOLDERS (для випадашки) ----------
router.get("/folders", async (req, res) => { // ← путь совпадает с фронтом
  try {
    const { destination, courseId, role } = req.query;
    const match = {};
    if (destination) match.destination = destination;
    if (courseId) match.courseId = courseId;
    if (role) match.role = role;

    const folders = await Library.distinct("folder", match);
    res.json(folders.filter(Boolean));
  } catch (err) {
    console.error("❌ List folders:", err);
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
    const { title, description, videoLink, folder, role } = req.body; // ← folder
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (folder !== undefined) update.folder = (folder || "").trim();
    if (role !== undefined) update.role = role;

    if (req.file) update.filePath = `/uploads/books/${req.file.filename}`;
    if (videoLink !== undefined) update.videoLink = videoLink;

    const item = await Library.findByIdAndUpdate(req.params.id, update, { new: true });
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