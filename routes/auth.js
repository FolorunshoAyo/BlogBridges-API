// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const generateToken = require('../middleware/generateToken');

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  try {
    const { username = null, email = null, password = null, role = null } = req.body;
    
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }], 
    });

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Email validation
    if (!email.match(emailRegex)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Checking existing users
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the user's password before saving it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword, role  });
    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const reqMsg = req.body;

    const username = reqMsg.username || "";
    const userEmail = reqMsg.email || "";
    const password = reqMsg.password;

    const user = await User.findOne({
      $or: [{ username: username }, { email: userEmail }],
    });


    if (!user) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    const {username: responseUsername, email, role} = user;

    res.json({ responseUsername, email, role, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
