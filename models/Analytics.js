const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  page: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
