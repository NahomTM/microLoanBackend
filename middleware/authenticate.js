const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../utils/authUtils'); 

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.json({ message: 'Access token required' });
  }

  const { valid, decoded } = verifyAccessToken(token);

  if (!valid) {
    return res.json({ message: 'Invalid token' });
  }

  req.user = decoded; 
  next();
};

module.exports = authenticateToken;