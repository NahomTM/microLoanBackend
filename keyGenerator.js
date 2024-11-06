const crypto = require('crypto');

const generateMasterKey = () => {
    const key = crypto.randomBytes(32).toString('hex');
    return key;
};

console.log('Generated Master Key:', generateMasterKey());

