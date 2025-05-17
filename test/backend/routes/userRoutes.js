const express = require('express');
const { registerUser, getAllUsers, getUserById, updateUserStatus } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.get('/', getAllUsers); // получить всех
router.get('/:id', getUserById); // получить одного
router.put('/:id/status', updateUserStatus); // обновить статус

module.exports = router;
