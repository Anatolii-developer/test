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

router.post('/:id/certificate', upload.single('certificate'), async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang; // "ua" или "eng"
    const file = req.file;

    if (!["ua", "eng"].includes(lang)) {
      return res.status(400).json({ message: 'Мова повинна бути ua або eng' });
    }

    if (!file) return res.status(400).json({ message: 'Файл не передан' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    const fileUrl = `/uploads/certificates/${file.filename}`;

    if (!user.certificates) user.certificates = {};
    user.certificates[lang] = { filename: file.originalname, url: fileUrl };

    await user.save();
    res.json({ message: `Сертифікат (${lang}) збережено`, url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});


module.exports = router;
