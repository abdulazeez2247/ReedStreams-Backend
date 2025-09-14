const crypto = require('crypto');

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex');
}
module.exports = hashIp;