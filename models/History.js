const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  contentId: String, // Identifier for the content (e.g., post or comment)
  contentType: String, // Type of content (e.g., 'post' or 'comment')
  originalContent: String, // Original content
  editedContent: String, // Edited content
  editor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who edited
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const History = mongoose.model('History', historySchema);

module.exports = History;
