const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/certificates"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// /api/users/:id/certificate?lang=ua or eng
router.post("/api/users/:id/certificate", upload.single("certificate"), async (req, res) => {
  const userId = req.params.id;
  const lang = req.query.lang; // ua or eng

  if (!["ua", "eng"].includes(lang)) {
    return res.status(400).send("Invalid language");
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  const fileUrl = `/uploads/certificates/${req.file.filename}`;

  // если нет поля certificates – создать
  if (!user.certificates) user.certificates = {};

  user.certificates[lang] = {
    filename: req.file.originalname,
    url: fileUrl
  };

  await user.save();
  res.send({ success: true, url: fileUrl });
});

module.exports = router;
