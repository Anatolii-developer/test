const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");

const router = express.Router();

// Настройка multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/certificates"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ✅ Путь должен быть: /:id/certificate — НЕ полный!
router.post("/:id/certificate", upload.single("certificate"), async (req, res) => {
  try {
    const userId = req.params.id;
    const lang = req.query.lang;
    const courseId = req.query.courseId;

    if (!["ua", "eng"].includes(lang) || !courseId) {
      return res.status(400).json({ success: false, message: "Missing or invalid query params" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const fileUrl = `/uploads/certificates/${req.file.filename}`;

    const certificates = user.certificates || {};
    const courseCerts = certificates[courseId] || {};

    courseCerts[lang] = {
      filename: req.file.originalname,
      url: fileUrl
    };

    certificates[courseId] = courseCerts;
    user.certificates = certificates;

    await user.save();
    res.json({ success: true, url: fileUrl });

  } catch (error) {
  console.error("❌ Certificate upload error:", error); // 👉 показывает весь объект ошибки
  res.status(500).json({
    success: false,
    message: "Server error",
    error: error.message,
    stack: error.stack   // 👈 добавляем стек для отладки
  });
}

});

module.exports = router;
