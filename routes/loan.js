const express = require('express');
const { createLoanAndManageCurrency, payBack, getLoans } = require('../controllers/loan');
const authenticateToken = require('../middleware/authenticate');

const router = express.Router();

router.put('/takeLoan/:id', authenticateToken, createLoanAndManageCurrency)
router.get('/getLoans', authenticateToken, getLoans)
router.put('/payBack', authenticateToken, payBack)

module.exports = router