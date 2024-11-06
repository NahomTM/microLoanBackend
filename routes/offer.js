const express = require('express');
const { getAllOffers, deleteOffer, updateOffer, createOffer, getAllActiveOffers } = require('../controllers/offer');
const authenticateToken = require('../middleware/authenticate');
const router = express.Router();

router.post('/createOffer', authenticateToken, createOffer);
router.get('/getOffers', authenticateToken, getAllOffers);
router.delete('/deleteOffer/:id', authenticateToken, deleteOffer);
router.put('/updateOffer/:id', authenticateToken, updateOffer);
router.get('/getAllActiveOffers', authenticateToken, getAllActiveOffers)

module.exports = router;
