const express = require('express');
const { registerUser, getAllUsers, getUserById, updateUserStatus, loginUser, updateUser } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.get('/', getAllUsers);
router.post("/login", loginUser);
router.put('/:id/status', updateUserStatus); // более специфичный
router.get('/:id', getUserById);             // общий get
router.put('/:id', updateUser);              // общий put

module.exports = router;
