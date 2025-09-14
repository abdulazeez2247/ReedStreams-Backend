const express = require('express');
const router = express.Router();

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
module.exports = router;
