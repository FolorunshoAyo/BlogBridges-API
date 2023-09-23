// middleware/verifyUser.js
function verifyUser(req, res, next) {
  // Check if the user is a user
  if (req.user.role === 'user') {
    next(); // Allow access for users
  } else {
    return res.status(403).json({ message: 'Access denied. User privileges required.' });
  }
}

module.exports = verifyUser;
