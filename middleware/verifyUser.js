// middleware/verifyUser.js
function verifyUser(req, res, next) {
  console.log(req.user);
  // Check if the user is a user
  if (req.user.role === 'reader') {
    next(); // Allow access for users
  } else {
    return res.status(403).json({ message: 'Access denied. Reader privileges required.' });
  }
}

module.exports = verifyUser;
