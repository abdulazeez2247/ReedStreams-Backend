const mongoose = require('mongoose');

const streamEventSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['start', 'stop', 'pause', 'resume'],
    required: true
  },
  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StreamEvent', streamEventSchema);