const express = require('express');
const { registerUser, blockUser, fetchAllUsers, dashboard, getUserProfile, submitKYC } = require('../controllers/user');
const authenticateToken = require('../middleware/authenticate');

const router = express.Router();

router.post('/register', registerUser);
router.get('/fetchUsers', fetchAllUsers);
router.put('/blockUser/:id', blockUser);
router.get('/dashboard', authenticateToken, dashboard);
router.get('/profile', getUserProfile)
router.post('/setKyc', authenticateToken, submitKYC)

module.exports = router;
