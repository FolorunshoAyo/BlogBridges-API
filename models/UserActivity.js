const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  likedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
  commentedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
  repliedComments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
});

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = UserActivity;
