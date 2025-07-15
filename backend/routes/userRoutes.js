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
router.post('/register', registerUser);
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


// =================== Certificate upload ===================
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
    console.error("❌ Certificate upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      stack: error.stack
    });
  }
});


module.exports = router;
