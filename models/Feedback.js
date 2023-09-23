const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
