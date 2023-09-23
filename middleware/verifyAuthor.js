// middleware/verifyAuthor.js

function verifyAuthor(req, res, next) {
  // Check if the user is an author (assuming user roles are stored in the JWT payload)
  if (req.user.role === 'author') {
    next(); // Allow access for authors
  } else {
    return res.status(403).json({ message: 'Access denied. Author privileges required.' });
  }
}

module.exports = verifyAuthor;
