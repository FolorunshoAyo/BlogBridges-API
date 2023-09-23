const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  readingHistory: [{
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    timestamp: Date,
  }],
  likedPosts: [{
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    timestamp: Date,
  }],
  interestedTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
  }],
  role: {
    type: String,
    enum: ['admin', 'author', 'reader'],
    default: 'reader',
  },
  // Total number of follows
  totalFollows: {
    type: Number,
    default: 0,
  },
  bio: String,
  profileImage: String,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
