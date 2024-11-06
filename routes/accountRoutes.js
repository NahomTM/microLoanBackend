const express = require('express');
const { generateAndStoreAccount } = require('../controllers/accountController');

const router = express.Router();

router.post('/createAccount', generateAndStoreAccount);

module.exports = router;
