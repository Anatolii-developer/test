const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");

const router = express.Router();

// Настройка multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../public/uploads/certificates")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ➕ POST /api/users/:id/certificate?lang=ua|eng
router.post("/api/users/:id/certificate", upload.single("certificate"), async (req, res) => {
  try {
    const userId = req.params.id;
    const lang = req.query.lang;

    if (!["ua", "eng"].includes(lang)) {
      return res.status(400).json({ success: false, message: "Invalid language" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const fileUrl = `/uploads/certificates/${req.file.filename}`;
    if (!user.certificates) user.certificates = {};

    user.certificates[lang] = {
      filename: req.file.originalname,
      url: fileUrl
    };

    await user.save();
    res.json({ success: true, url: fileUrl });

  } catch (error) {
    console.error("❌ Certificate upload error:", error.message);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
