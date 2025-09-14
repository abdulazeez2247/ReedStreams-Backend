const UserSession = require('../models/UserSession');
const StreamEvent = require('../models/StreamEvent');

// Track unique users by IP
exports.trackUser = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Check if we've seen this IP in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const existingSession = await UserSession.findOne({
      ipAddress: ip,
      lastSeen: { $gte: twentyFourHoursAgo }
    });
    
    if (!existingSession) {
      // New unique user
      await UserSession.create({
        ipAddress: ip,
        userAgent: userAgent,
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    } else {
      // Update last seen time for existing user
      existingSession.lastSeen = new Date();
      await existingSession.save();
    }
    
    next();
  } catch (error) {
    console.error('User tracking error:', error);
    next(); // Don't break the request if tracking fails
  }
};

// Track stream events
exports.trackStreamEvent = async (req, res, next) => {
  try {
    const { matchId, action } = req.body; // action: 'start', 'stop', 'pause'
    const ip = req.ip || req.connection.remoteAddress;
    
    if (matchId && action) {
      await StreamEvent.create({
        matchId,
        action,
        ipAddress: ip,
        timestamp: new Date()
      });
    }
    
    next();
  } catch (error) {
    console.error('Stream event tracking error:', error);
    next();
  }
};