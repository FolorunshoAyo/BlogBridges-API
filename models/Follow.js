const mongoose = require('mongoose');

// Define a schema for user follows
const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  followedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create the Follow model
const Follow = mongoose.model('Follow', followSchema);

module.exports = Follow;
