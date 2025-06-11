const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// Конфигурация multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// POST /api/upload/:id/certificate
router.post('/:id/certificate', upload.single('certificate'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Файл не передан' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    const fileUrl = `/uploads/certificates/${file.filename}`;

    user.certificates.push({ filename: file.originalname, url: fileUrl });
    await user.save();

    res.json({ message: 'Сертифікат збережено', url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

module.exports = router;