
const express = require('express');
const router = express.Router();
const { sendXRP, transactHistory } = require('../controllers/transaction');

router.post('/send-xrp', sendXRP);
router.get('/history', transactHistory)

module.exports = router;
