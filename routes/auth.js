// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const generateToken = require('../middleware/authenticate');

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the user's password before saving it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, hashedPassword, role  });
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
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    const {name, email, role} = user;

    res.json({ name, email, role, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
