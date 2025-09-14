const express = require('express');
const router = express.Router();
const Visitor = require('../models/visitor');
const Stream = require('../models/stream');
const { hashIp } = require('../utils/hashIp'); // see helper below

// Track a visitor (called on page load from frontend)
router.post('/track-visit', async (req, res) => {
  try {
    // get IP - if behind proxy, ensure trust proxy and use req.ip or req.headers['x-forwarded-for']
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ipHash = hashIp(ip);
    const ua = req.get('User-Agent') || '';

    const existing = await Visitor.findOne({ ipHash });
    if (existing) {
      existing.lastSeen = Date.now();
      existing.visits = existing.visits + 1;
      existing.lastUserAgent = ua;
      await existing.save();
    } else {
      await Visitor.create({ ipHash, lastUserAgent: ua });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Stream start: call when a user starts streaming from your site
router.post('/streams/start', async (req, res) => {
  try {
    const { streamId, matchId, url } = req.body;
    if (!streamId) return res.status(400).json({ error: 'streamId required' });

    const stream = await Stream.findOneAndUpdate(
      { streamId },
      { $set: { matchId, url, isActive: true, startedAt: Date.now() }, $inc: { playCount: 1 } },
      { upsert: true, new: true }
    );

    res.json({ ok: true, stream });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Stream stop: call when user stops/ends stream
router.post('/streams/stop', async (req, res) => {
  try {
    const { streamId } = req.body;
    if (!streamId) return res.status(400).json({ error: 'streamId required' });

    const stream = await Stream.findOneAndUpdate(
      { streamId },
      { $set: { isActive: false, endedAt: Date.now() } },
      { new: true }
    );

    res.json({ ok: true, stream });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
