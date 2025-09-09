const axios = require("axios");
const dotenv = require("dotenv").config();
const AppError = require("../utils/appError");
const { URL } = require("url");
const API_BASE_URL = "https://api.thesports.com";
const USER_KEY = process.env.THE_SPORTS_API_USER;
const SECRET_KEY = process.env.THE_SPORTS_API_SECRET;

const SPORTS_MAPPING = {
  football: { id: 1, name: "Soccer", slug: "soccer" },
  amfootball: { id: 17, name: "NFL", slug: "NFL" },
  baseball: { id: 6, name: "Baseball", slug: "baseball" },
};

const getproxyStream = async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://reedstreams.live");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const streamUrl = req.query.url;

  if (!streamUrl) {
    return next(new AppError("Stream URL is required for proxy.", 400));
  }

  try {
    console.log("Proxying URL:", streamUrl);

    const decodedUrl = decodeURIComponent(streamUrl);
    const originalCDNBasePath = decodedUrl.substring(
      0,
      decodedUrl.lastIndexOf("/") + 1
    );

    const axiosConfig = {
      method: "get",
      url: decodedUrl,
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: originalCDNBasePath,
        Accept: "*/*",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
      validateStatus: function (status) {
        return status < 500;
      },
    };

    const isM3U8 = decodedUrl.endsWith(".m3u8");
    if (isM3U8) {
      axiosConfig.responseType = "text";
    } else {
      axiosConfig.responseType = "stream";
    }

    const response = await axios(axiosConfig);

    console.log("Proxy response status:", response.status);

    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    if (response.headers["cache-control"]) {
      res.setHeader("Cache-Control", response.headers["cache-control"]);
    }

    if (isM3U8) {
      let m3u8Content = response.data;

      m3u8Content = m3u8Content
        .split("\n")
        .map((line) => {
          if (line.startsWith("#") || line.trim() === "") {
            return line;
          }

          if (
            (line.endsWith(".m3u8") || line.endsWith(".ts")) &&
            !line.startsWith("http")
          ) {
            const absoluteCDNUrl = new URL(line, originalCDNBasePath).href;
            const yourProxyBase =
              "https://reedstreams-backend.onrender.com/api/matches/proxy-stream?url=";
            return `${yourProxyBase}${encodeURIComponent(absoluteCDNUrl)}`;
          }
          return line;
        })
        .join("\n");

      res.send(m3u8Content);
    } else {
      response.data.pipe(res);

      response.data.on("error", (pipeError) => {
        console.error("Error during stream piping:", pipeError);
        if (!res.headersSent) {
          res.status(500).send("Stream piping error");
        }
      });
    }
  } catch (error) {
    console.error("Error in proxy stream:", error.message);

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Stream source request timed out" });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        error: `Stream source returned ${error.response.status}`,
      });
    }

    return res.status(500).json({ error: "Failed to proxy stream" });
  }
};
const getLiveStreams = async (req, res, next) => {
  try {
    console.log("⏳ Fetching fresh live streams from API...");
    const { data: streamData } = await axios.get(
      `${API_BASE_URL}/v1/video/play/stream/list`,
      {
        params: { user: USER_KEY, secret: SECRET_KEY },
        timeout: 30000,
      }
    );

    if (!streamData?.results?.length) {
      return next(new AppError("No live streams found from API.", 404));
    }

    const now = Date.now();
    const filteredStreams = streamData.results
      .filter((s) => [1, 6, 17].includes(s.sport_id))
      .map((s) => {
        let sport_name = "unknown";
        if (s.sport_id === 1) sport_name = "football";
        if (s.sport_id === 6) sport_name = "baseball";
        if (s.sport_id === 17) sport_name = "amfootball";

        const match_time_unix = s.match_time;

        let match_time_date = null;
        let start_time_formatted = "N/A";

        if (match_time_unix) {
          try {
            const timestamp =
              typeof match_time_unix === "string"
                ? parseInt(match_time_unix)
                : match_time_unix;

            if (!isNaN(timestamp)) {
              match_time_date = new Date(timestamp * 1000);
              start_time_formatted = match_time_date.toLocaleString();
            }
          } catch (e) {
            console.warn("Invalid match_time format:", match_time_unix);
          }
        }

        const home_team = s.home || "TBD";
        const away_team = s.away || "TBD";
        const competition_name = s.comp || s.competition_name || "Unknown";

        let match_status = "LIVE";
        if (match_time_unix) {
          const timeDiff = now - match_time_unix * 1000;
          if (timeDiff >= 3 * 60 * 60 * 1000) {
            match_status = "FINISHED";
          } else if (timeDiff < 0) {
            match_status = "UPCOMING";
          }
        }

        if (!s.playurl1 && !s.playurl2) {
          match_status = "FINISHED";
        }

        return {
          sport_name,
          competition_name,
          home_name: home_team,
          away_name: away_team,
          start_time: start_time_formatted,
          match_status,
          match_id: s.id || null,
          playurl1: s.playurl1 || null,
          playurl2: s.playurl2 || null,
          raw_match_time: match_time_unix,
        };
      });

    if (!filteredStreams.length) {
      return next(
        new AppError(
          "No football, baseball or American football streams found.",
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      results: filteredStreams.length,
      data: { streams: filteredStreams },
    });
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    return next(
      new AppError("Failed to fetch live matches", 500, errorMessage)
    );
  }
};
// const getLiveStreams = async (req, res, next) => {
//   try {
//     console.log("⏳ Fetching fresh live streams from API...");
//     const { data: streamData } = await axios.get(
//       `${API_BASE_URL}/v1/video/play/stream/list`,
//       {
//         params: { user: USER_KEY, secret: SECRET_KEY },
//         timeout: 30000,
//       }
//     );

//     // FIX: The API returns an array directly, not streamData.results
//     const streamsArray = Array.isArray(streamData) ? streamData : [];
    
//     if (!streamsArray.length) {
//       return next(new AppError("No live streams found from API.", 404));
//     }

//     const now = Date.now();
//     const filteredStreams = streamsArray
//       .filter((s) => [1, 6, 17].includes(s.sport_id))
//       .map((s) => {
//         let sport_name = "unknown";
//         if (s.sport_id === 1) sport_name = "football";
//         if (s.sport_id === 6) sport_name = "baseball";
//         if (s.sport_id === 17) sport_name = "amfootball";

//         const match_time_unix = s.match_time;

//         let match_time_date = null;
//         let start_time_formatted = "N/A";

//         if (match_time_unix) {
//           try {
//             const timestamp =
//               typeof match_time_unix === "string"
//                 ? parseInt(match_time_unix)
//                 : match_time_unix;

//             if (!isNaN(timestamp)) {
//               match_time_date = new Date(timestamp * 1000);
//               start_time_formatted = match_time_date.toLocaleString();
//             }
//           } catch (e) {
//             console.warn("Invalid match_time format:", match_time_unix);
//           }
//         }

//         const home_team = s.home || "TBD";
//         const away_team = s.away || "TBD";
//         const competition_name = s.comp || s.competition_name || "Unknown";

//         // FIX: Handle numeric match_status (44 = LIVE)
//         let match_status = "LIVE";
//         if (s.match_status === 44) {
//           match_status = "LIVE";
//         } else if (s.match_status === 43) { // Example: 43 might be FINISHED
//           match_status = "FINISHED";
//         }

//         // FIX: Check for empty strings too
//         const hasValidUrl = (url) => url && url.trim() !== "";
//         if (!hasValidUrl(s.playurl1) && !hasValidUrl(s.playurl2)) {
//           match_status = "FINISHED";
//         }

//         return {
//           sport_name,
//           competition_name,
//           home_name: home_team,
//           away_name: away_team,
//           start_time: start_time_formatted,
//           match_status,
//           match_id: s.match_id || s.id || null,
//           playurl1: s.playurl1 || null,
//           playurl2: s.playurl2 || null,
//           raw_match_time: match_time_unix,
//         };
//       });

//     if (!filteredStreams.length) {
//       return next(
//         new AppError(
//           "No football, baseball or American football streams found.",
//           404
//         )
//       );
//     }

//     res.status(200).json({
//       status: "success",
//       results: filteredStreams.length,
//       data: { streams: filteredStreams },
//     });
//   } catch (err) {
//     const errorMessage = err.response?.data?.message || err.message;
//     return next(
//       new AppError("Failed to fetch live matches", 500, errorMessage)
//     );
//   }
// };
const getSingleMatchDiary = async (req, res, next) => {
  const { sportName, matchId } = req.params;

  const allowedSports = ["football", "baseball", "amfootball"];
  if (!allowedSports.includes(sportName)) {
    return next(
      new AppError(
        `This endpoint is only for ${allowedSports.join(", ")}.`,
        400
      )
    );
  }
};

module.exports = {
  getLiveStreams,
  getSingleMatchDiary,
  getproxyStream,
};
