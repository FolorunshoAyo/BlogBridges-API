const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ROUTE IMPORTS
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/post');
const userActivityRoutes = require('./routes/user');
const authorRoutes = require("./routes/author");

// MongoDB Connection
const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/post', postRoutes);
app.use('/api/user', userActivityRoutes);
app.use('/api/author', authorRoutes);


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
