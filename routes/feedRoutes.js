const express = require("express");
const {
  getHomeTimeline,
  getDiscoverFeed,
  getTrendingFeed,
  getLatestFeed,
  getPopularFeed,
} = require("../controllers/feedController");
const { generalLimiter } = require("../middleware/rateLimit");

const router = express.Router();

/**
 * Feed routes - Hybrid push-pull strategy
 */

// Home feed (following + personalized)
router.get("/home/:userId", generalLimiter, getHomeTimeline);

// Discover feed (trending/popular)
router.get("/discover", generalLimiter, getDiscoverFeed);

// Specific feed types
router.get("/trending", generalLimiter, getTrendingFeed);
router.get("/latest", generalLimiter, getLatestFeed);
router.get("/popular", generalLimiter, getPopularFeed);

module.exports = router;
