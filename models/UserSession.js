const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: String,
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient unique user counting
userSessionSchema.index({ ipAddress: 1, firstSeen: 1 });

module.exports = mongoose.model('UserSession', userSessionSchema);