const Visitor = require("../models/visitor");
const hashIp = require("../utils/hashIp");

module.exports = async function logUser(req, res, next) {
  try {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "";
    const ipHash = hashIp(ip);

    await Visitor.updateOne(
      { ipHash },
      {
        $set: { ipHash, lastSeen: new Date(), lastUserAgent: req.headers["user-agent"] },
        $inc: { visits: 1 }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Visitor log error:", err.message);
  }
  next();
};
