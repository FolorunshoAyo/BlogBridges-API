const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;
