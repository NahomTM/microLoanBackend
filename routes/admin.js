const express = require('express');
const { createAdmin, dashboard } = require('../controllers/admin');
const authenticateToken = require('../middleware/authenticate');

const router = express.Router()

router.post('/createAdmin', authenticateToken, createAdmin)
router.get('/dashboard', authenticateToken, dashboard)

module.exports = router;