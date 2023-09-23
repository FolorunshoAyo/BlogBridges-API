const crypto = require('crypto');

// Generate a random secret key (32 bytes)
const secretKey = crypto.randomBytes(32).toString('hex');
console.log(secretKey);
