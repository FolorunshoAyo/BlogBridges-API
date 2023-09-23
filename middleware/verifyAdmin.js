// middleware/verifyAdmin.js

function verifyAdmin(req, res, next) {
  if (req.user.role === "admin") {
    next(); // Allow access for admins
  } else {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }
}

module.exports = verifyAdmin;
