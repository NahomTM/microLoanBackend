const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT_SECRET_KEY;
const expiresIn = '30d';


const createAccessToken = (user) => {
  const { id, fullName, role, status } = user;
  const token = jwt.sign({ id, fullName, role, status }, secretKey, { expiresIn });
  return token;
};


const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, secretKey); 
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error };
  }
};

module.exports = { createAccessToken, verifyAccessToken };