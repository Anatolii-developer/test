const express = require('express');
const router = express.Router();
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const {
  registerUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  loginUser,
  updateUser,
  sendRecoveryCode,
  uploadUserPhoto
} = require('../controllers/userController');

const User = require('../models/User');
const sendConfirmationEmail = require('../mailer'); // 📧 добавлено

// =================== Multer setups ===================

// Для фото профиля
const profilePhotoUpload = multer({ dest: "uploads/" });

// Для сертификатов
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../public/uploads/certificates")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const certUpload = multer({ storage: certStorage });

// =================== Routes ===================

// Auth & general
router.post('/register', async (req, res) => {
  try {
    const newUser = await registerUser(req, res, true); // доп логика в контроллере для отправки
    if (!newUser) return; // ошибка уже отправлена

    // Отправка письма
    await sendConfirmationEmail(newUser.email, newUser.firstName, newUser.lastName);
    console.log("✅ Confirmation email sent to", newUser.email);
  } catch (error) {
    console.error("❌ Registration + email error:", error);
    res.status(500).json({ message: "Помилка при реєстрації" });
  }
});


router.get("/users-with-roles", async (req, res) => {
  try {
    const users = await User.find({}, "firstName lastName email role status");
    res.json(users);
  } catch (err) {
    console.error("Ошибка при получении пользователей:", err);
    res.status(500).json({ message: "Серверная ошибка" });
  }
});

router.get("/roles-with-users", async (req, res) => {
  try {
    const users = await User.find(
      { roles: { $exists: true, $ne: [] } },
      "firstName lastName roles status"
    );

    const grouped = {};

    for (const user of users) {
      if (Array.isArray(user.roles)) {
        for (const role of user.roles) {
          if (!grouped[role]) grouped[role] = [];
          grouped[role].push({
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            status: user.status
          });
        }
      }
    }

    res.json(grouped);
  } catch (err) {
    console.error("❌ roles-with-users error:", err);
    res.status(500).json({ message: "Серверна помилка", error: err.message });
  }
});

router.post("/login", loginUser);
router.post("/forgot-password", sendRecoveryCode);

router.get('/approved', async (req, res) => {
  try {
    const users = await User.find({ status: "APPROVED" });
    res.json(users);
  } catch (error) {
    console.error("Error getting approved users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id/status', updateUserStatus);
router.put('/:id', updateUser);
router.post("/:id/photo", profilePhotoUpload.single("photo"), uploadUserPhoto);

router.post("/:id/certificate", certUpload.single("certificate"), async (req, res) => {
  try {
    const userId = req.params.id;
    const lang = req.query.lang;
    const courseId = req.query.courseId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    if (!["ua", "eng"].includes(lang) || !courseId) {
      return res.status(400).json({ success: false, message: "Missing or invalid query params" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const fileUrl = `/uploads/certificates/${req.file.filename}`;

    if (!user.certificates) user.certificates = {};
    if (!user.certificates[courseId]) user.certificates[courseId] = {};

    user.certificates[courseId][lang] = {
      filename: req.file.originalname,
      url: fileUrl,
      uploadedAt: new Date()
    };

    user.markModified("certificates");
    await user.save();

    console.log("✅ Certificate saved for user", userId);
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("❌ Certificate upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});




module.exports = router;
