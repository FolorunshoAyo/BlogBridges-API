const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
