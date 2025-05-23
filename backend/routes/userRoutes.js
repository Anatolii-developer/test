const express = require('express');
const { registerUser, getAllUsers, getUserById, updateUserStatus, loginUser } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.get('/', getAllUsers); // получить всех
router.get('/:id', getUserById); // получить одного
router.put('/:id/status', updateUserStatus); // обновить статус
router.post("/login", loginUser);

module.exports = router;
