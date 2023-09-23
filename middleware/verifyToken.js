// middleware/verifyToken.js
function verifyToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token is not valid' });
    }

    // Store the user's role in the request object
    req.user = user;

    // Check if the user is an admin
    if (user.role === 'admin') {
      req.isAdmin = true;
    } else {
      req.isAdmin = false;
    }

    next();
  });
}

module.exports = verifyToken;
