const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ipHash: { type: String, required: true, unique: true },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  visits: { type: Number, default: 1 },
  lastUserAgent: String
});

module.exports = mongoose.model('Visitor', visitorSchema);
