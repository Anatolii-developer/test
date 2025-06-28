const express = require('express');
const { registerUser, getAllUsers, getUserById, updateUserStatus, loginUser, updateUser, sendRecoveryCode} = require('../controllers/userController');
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { uploadUserPhoto } = require('../controllers/userController');
const User = require('../models/User');


router.post('/register', registerUser);
router.get("/approved", async (req, res) => {
  try {
    const users = await User.find({ status: "APPROVED" });
    res.json(users);
  } catch (error) {
    console.error("Error getting approved users:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get('/', getAllUsers);
router.post("/login", loginUser);
router.put('/:id/status', updateUserStatus); // более специфичный
router.get('/:id', getUserById);             // общий get
router.put('/:id', updateUser);  
router.post("/forgot-password", sendRecoveryCode);
router.post("/:id/photo", upload.single("photo"), uploadUserPhoto);
       // общий put


module.exports = router;
