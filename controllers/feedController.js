const feedFanoutService = require("../services/feedFanoutService");
const { ensureUserExists } = require("../utils/userSync");

/**
 * Feed Controller - Handles feed retrieval (home, discover, etc.)
 * Uses hybrid push-pull strategy from FeedFanoutService
 */

/**
 * Get user's home feed (following + pre-computed timeline)
 * Hybrid approach: Uses push-computed timeline if available, falls back to pull
 */
const getHomeTimeline = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from route params
    const { page = 1, limit = 10 } = req.query;

    console.log(`\n📖 [getFeed] Home timeline for user ${userId}`);

    // Validate user exists
    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await feedFanoutService.getHomeTimeline(user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get discover feed (trending/popular posts)
 * Pure PULL strategy with ranking
 */
const getDiscoverFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "trending" } = req.query;

    console.log(`\n🎯 [getDiscoverFeed] ${sortBy} feed, page ${page}`);

    const result = await feedFanoutService.getDiscoverFeed({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get trending posts (last 7 days)
 */
const getTrendingFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await feedFanoutService.getDiscoverFeed({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: "trending",
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get latest posts
 */
const getLatestFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await feedFanoutService.getDiscoverFeed({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: "latest",
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get popular posts
 */
const getPopularFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await feedFanoutService.getDiscoverFeed({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: "popular",
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getHomeTimeline,
  getDiscoverFeed,
  getTrendingFeed,
  getLatestFeed,
  getPopularFeed,
};
