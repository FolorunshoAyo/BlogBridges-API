// middleware/verifyAdmin.js

function verifyAdminOrAuthor(req, res, next) {
    if (req.user.role === "admin" || req.user.role === "author") {
      next(); // Allow access for admins
    } else {
      return res
        .status(403)
        .json({ message: "Access denied. Admin or Author privileges required." });
    }
  }
  
  module.exports = verifyAdminOrAuthor;
  