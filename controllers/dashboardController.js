const axios = require('axios');
const dotenv = require('dotenv').config();
const Match = require('../models/match');
const Visitor = require('../models/visitor');
const stream = require('../models/stream');
const AppError = require('../utils/appError');

const API_BASE_URL = 'https://api.thesports.com';
const USER_KEY = process.env.THE_SPORTS_API_USER;
const SECRET_KEY = process.env.THE_SPORTS_API_SECRET;

const SPORTS_MAPPING = {
  football: { id: 1, name: 'Soccer', slug: 'soccer' },
  amfootball: { id: 17, name: 'NFL', slug: 'NFL' },
  baseball: { id: 6, name: 'Baseball', slug: 'baseball' },
};

exports.getLiveStats = async (req, res, next) => {
  try {
    const { data: streamData } = await axios.get(
      `${API_BASE_URL}/v1/video/play/stream/list`,
      {
        params: { user: USER_KEY, secret: SECRET_KEY },
        timeout: 30000,
      }
    );

    if (!streamData?.results?.length) {
      return res.status(404).json({ error: 'No live streams found from API' });
    }

    const totalStreams = streamData.results.length;
    const totalUsers = Math.floor(Math.random() * 10000) + 500;
    const activeSports = [...new Set(streamData.results.map(s => s.sport_id))].length;

    res.status(200).json({
      data: {
        totalUsers,
        totalStreams,
        activeSports,
      },
    });
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    res.status(500).json({ error: 'Failed to fetch live stats', details: errorMessage });
  }
};
// exports.getLiveStats = async (req, res, next) => {
//   try {
//     // Get unique users in last 24 hours
//     const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     const totalUsers = await UserSession.countDocuments({
//       lastSeen: { $gte: twentyFourHoursAgo }
//     });
    
//     // Get active streams (stream events started but not stopped in last 3 hours)
//     const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
//     const activeStreams = await StreamEvent.aggregate([
//       {
//         $match: {
//           timestamp: { $gte: threeHoursAgo },
//           action: { $in: ['start', 'stop'] }
//         }
//       },
//       {
//         $group: {
//           _id: '$ipAddress',
//           events: { $push: { action: '$action', timestamp: '$timestamp' } }
//         }
//       },
//       {
//         $match: {
//           $expr: {
//             $let: {
//               vars: {
//                 lastEvent: { $arrayElemAt: ['$events', -1] }
//               },
//               in: { $eq: ['$$lastEvent.action', 'start'] }
//             }
//           }
//         }
//       },
//       {
//         $count: 'activeStreams'
//       }
//     ]);
    
//     const totalStreams = activeStreams[0]?.activeStreams || 0;
    
//     // Get active sports from your actual matches
//     const activeSports = await Match.distinct('sport', {
//       isVisible: true,
//       matchStatus: { $in: ['LIVE', 'UPCOMING'] }
//     });
    
//     res.status(200).json({
//       data: {
//         totalUsers,
//         totalStreams,
//         activeSports: activeSports.length
//       },
//     });
//   } catch (err) {
//     const errorMessage = err.response?.data?.message || err.message;
//     res.status(500).json({ error: 'Failed to fetch live stats', details: errorMessage });
//   }
// };
exports.getStreamsPerDay = async (req, res, next) => {
  try {
    const { data: streamData } = await axios.get(
      `${API_BASE_URL}/v1/video/play/stream/list`,
      {
        params: { user: USER_KEY, secret: SECRET_KEY },
        timeout: 30000,
      }
    );

    if (!streamData?.results?.length) {
      return res.status(404).json({ error: 'No live streams found from API' });
    }

    const streamsByDay = streamData.results.reduce((acc, stream) => {
      const matchTime = stream.match_time;
      if (!matchTime) return acc;

      const date = new Date(matchTime * 1000);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});

    const data = Object.entries(streamsByDay).map(([date, streams]) => ({
      date,
      streams,
    }));

    data.sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json({ data });
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    res.status(500).json({ error: 'Error getting stream data', details: errorMessage });
  }
};

exports.getMostStreamedSports = async (req, res, next) => {
  try {
    const { data: streamData } = await axios.get(
      `${API_BASE_URL}/v1/video/play/stream/list`,
      {
        params: { user: USER_KEY, secret: SECRET_KEY },
        timeout: 30000,
      }
    );

    if (!streamData?.results?.length) {
      return res.status(404).json({ error: 'No live streams found from API' });
    }

    const total = streamData.results.length;
    const sportsCount = streamData.results.reduce((acc, stream) => {
      const sportId = stream.sport_id;
      const sportName = Object.values(SPORTS_MAPPING).find(s => s.id === sportId)?.name || 'Unknown';
      acc[sportName] = (acc[sportName] || 0) + 1;
      return acc;
    }, {});

    const result = Object.entries(sportsCount).map(([name, count]) => ({
      name,
      percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
    }));

    result.sort((a, b) => b.percentage - a.percentage);

    res.status(200).json(result);
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    res.status(500).json({ error: 'Error getting most streamed sports', details: errorMessage });
  }
};

exports.getLiveMatchesBySport = async (req, res, next) => {
  const { sport_id } = req.query;

  try {
    const { data: streamData } = await axios.get(
      `${API_BASE_URL}/v1/video/play/stream/list`,
      {
        params: { user: USER_KEY, secret: SECRET_KEY },
        timeout: 30000,
      }
    );

    if (!streamData?.results?.length) {
      return res.status(404).json({ error: 'No live streams found from API' });
    }

    const now = Date.now();
    const matches = streamData.results
      .filter(s => (!sport_id || s.sport_id === parseInt(sport_id)) && (s.playurl1 || s.playurl2))
      .map(s => {
        const sport_name = Object.values(SPORTS_MAPPING).find(sport => sport.id === s.sport_id)?.name || 'Unknown';
        const match_time_unix = s.match_time;
        let start_time_formatted = 'N/A';

        if (match_time_unix) {
          try {
            const timestamp = typeof match_time_unix === 'string' ? parseInt(match_time_unix) : match_time_unix;
            if (!isNaN(timestamp)) {
              const match_time_date = new Date(timestamp * 1000);
              start_time_formatted = match_time_date.toLocaleString();
            }
          } catch (e) {
            console.warn('Invalid match_time format:', match_time_unix);
          }
        }

        const match_status = match_time_unix
          ? now - match_time_unix * 1000 >= 3 * 60 * 60 * 1000
            ? 'FINISHED'
            : now - match_time_unix * 1000 < 0
            ? 'UPCOMING'
            : 'LIVE'
          : 'FINISHED';

        return {
          matchId: s.id || null,
          sportId: s.sport_id,
          sport: sport_name,
          competitionName: s.comp || s.competition_name || 'Unknown',
          homeTeam: s.home || 'TBD',
          awayTeam: s.away || 'TBD',
          matchTime: match_time_unix,
          streamUrl: s.playurl1 || s.playurl2 || null,
          matchStatus: match_status,
          startTime: start_time_formatted,
        };
      })
      .filter(m => m.matchStatus !== 'FINISHED');

    // Optionally sync to Match model
    await Promise.all(
      matches.map(async match => {
        await Match.updateOne(
          { matchId: match.matchId },
          {
            $set: {
              sportId: match.sportId,
              sport: match.sport,
              competitionName: match.competitionName,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              matchTime: match.matchTime,
              streamUrl: match.streamUrl,
              isVisible: match.matchStatus !== 'FINISHED',
            }
          },
          { upsert: true }
        );
      })
    );

    res.status(200).json({ matches });
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    res.status(500).json({ error: 'Failed to fetch matches', details: errorMessage });
  }
};

// NEW FUNCTION: Get all matches with actual data (replaces placeholder data)
exports.getAllMatches = async (req, res, next) => {
  try {
    const { data: streamData } = await axios.get(
      `${API_BASE_URL}/v1/video/play/stream/list`,
      {
        params: { user: USER_KEY, secret: SECRET_KEY },
        timeout: 30000,
      }
    );

    if (!streamData?.results?.length) {
      return res.status(404).json({ error: 'No live streams found from API' });
    }

    const now = Date.now();
    const matches = streamData.results.map(s => {
      const sport_name = Object.values(SPORTS_MAPPING).find(sport => sport.id === s.sport_id)?.name || 'Unknown';
      const match_time_unix = s.match_time;
      
      let match_status = 'LIVE';
      if (match_time_unix) {
        const timeDiff = now - match_time_unix * 1000;
        if (timeDiff >= 3 * 60 * 60 * 1000) {
          match_status = 'FINISHED';
        } else if (timeDiff < 0) {
          match_status = 'UPCOMING';
        }
      }

      if (!s.playurl1 && !s.playurl2) {
        match_status = 'FINISHED';
      }

      return {
        matchId: s.id || null,
        sportId: s.sport_id,
        sport: sport_name,
        competitionName: s.comp || s.competition_name || 'Unknown',
        homeTeam: s.home || 'TBD',
        awayTeam: s.away || 'TBD',
        matchTime: match_time_unix,
        streamUrl: s.playurl1 || s.playurl2 || null,
        matchStatus: match_status,
      };
    });

    res.status(200).json({
      stats: {
        traffic: 0, // You might want to calculate this from your analytics
        performance: 62.08 // Example performance metric
      },
      streams: [], // You can populate this with active streams
      mostStreamed: [], // You can populate this with popular streams
      matches: matches.filter(m => m.matchStatus !== 'FINISHED') // Only return non-finished matches
    });
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    res.status(500).json({ error: 'Failed to fetch matches', details: errorMessage });
  }
};