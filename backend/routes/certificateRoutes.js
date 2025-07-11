const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/certificates');
    fs.mkdirSync(uploadPath, { recursive: true }); // создаём папку, если нет
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Загрузка сертификата
router.post('/users/:userId/certificate', upload.single('certificate'), async (req, res) => {
  try {
    const { userId } = req.params;
    const lang = req.query.lang;
    if (!['ua', 'eng'].includes(lang)) {
      return res.status(400).json({ message: 'Невірна мова сертифікату' });
    }

    const fileUrl = `/uploads/certificates/${req.file.filename}`;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    user.certificates = user.certificates || {};
    user.certificates[lang] = { url: fileUrl };
    await user.save();

    res.status(200).json({ message: 'Сертифікат успішно збережено', url: fileUrl });
  } catch (err) {
    console.error('❌ Серверна помилка при збереженні сертифікату:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

module.exports = router;
