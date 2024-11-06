const express = require('express')
const { signIn, updateUserStatus } = require('../controllers/auth')

const router = express.Router()

router.post('/signIn', signIn)
router.post('/update-status/:id', updateUserStatus);

module.exports = router