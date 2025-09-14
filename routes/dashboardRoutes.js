const express = require('express');
const router = express.Router();
const { trackUser, trackStreamEvent} = require('../middleware/tracking');

const {
  getLiveStats,
  getStreamsPerDay,
  getMostStreamedSports,
  getLiveMatchesBySport,
  getAllMatches
} = require('../controllers/dashboardController'); 

router.get('/live-stats', getLiveStats);
router.get('/streams-per-day', getStreamsPerDay);
router.get('/most-streamed-sports', getMostStreamedSports);
router.get('/matches',getLiveMatchesBySport);
router.get('/all-matches', getAllMatches); 

router.post('/stream-event', trackStreamEvent, (req, res) => {
  res.status(200).json({ message: 'Stream event tracked' });
});

module.exports = router;
