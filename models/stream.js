const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  streamId: { type: String, required: true, unique: true }, // could be match id or generated id
  matchId: String,
  url: String,
  isActive: { type: Boolean, default: false },
  startedAt: Date,
  endedAt: Date,
  playCount: { type: Number, default: 0 } // increments on each play event if you want
});

module.exports = mongoose.model('Stream', streamSchema);
