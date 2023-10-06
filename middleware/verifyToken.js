// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const fullToken = req.header('Authorization');

  if(fullToken){
    const token = fullToken.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token is not valid' });
      }
  
      // Store the user's role in the request object
      req.user = user;
  
      next();
    });
    
  }else{
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = verifyToken;
