const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedContent: String,
  reason: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
