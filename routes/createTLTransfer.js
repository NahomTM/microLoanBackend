const express = require('express');
const { createTrustlineAndSendCurrency } = require('../controllers/createTLTransfer');

const router = express.Router();

router.post('/createTransfer', createTrustlineAndSendCurrency)

module.exports = router