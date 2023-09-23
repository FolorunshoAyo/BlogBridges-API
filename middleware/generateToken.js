// middleware/generateToken.js
const jwt = require('jsonwebtoken');

function generateToken(user) {
  const payload = {
    id: user._id,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = generateToken;
