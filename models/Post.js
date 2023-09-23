const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  publicationDate: {
    type: Date,
    default: Date.now,
  },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  media: {
    // An array of media files associated with the post
    files: [{
      fileName: String, // The name of the file
      fileType: String, // The type of the file (e.g., image/jpeg)
    }],
  },
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;