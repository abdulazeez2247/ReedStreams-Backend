// const express = require("express");
// const router = express.Router();
// const {
//   getLiveStreams,
//   getproxyStream,
//   getSingleMatchDiary
// } = require("../controllers/matchController");


// router.get("/streams", getLiveStreams);            
// router.get("/proxy-stream", getproxyStream);      


// router.get("/:sportName/:matchId", getSingleMatchDiary); 

// module.exports = router;
const express = require("express");
const router = express.Router();
const {
  getLiveStreams,
  getproxyStream,
  getSingleMatchDiary,
} = require("../controllers/matchController");

// Handle OPTIONS requests for preflight (CORS)
router.options("/proxy-stream", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://reed-streams-live-sports-doxe.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Handle OPTIONS requests for streams endpoint as well
router.options("/streams", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://reed-streams-live-sports-doxe.vercel.app', 'https://reedstreams.live');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Handle OPTIONS requests for match diary endpoint
router.options("/:sportName/:matchId", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://reed-streams-live-sports-doxe.vercel.app', 'https://reedstreams.live');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Your existing routes
router.get("/streams", getLiveStreams);            
router.get("/proxy-stream", getproxyStream);      
router.get("/:sportName/:matchId", getSingleMatchDiary); 

module.exports = router;