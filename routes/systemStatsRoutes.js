const express = require("express");
const {
  getOutboxStats,
  getSocketStats,
  getFeedSystemStats,
  getPendingEvents,
  getFailedEvents,
  retryFailedEvent,
} = require("../controllers/systemStatsController");
const { generalLimiter } = require("../middleware/rateLimit");

const router = express.Router();

/**
 * Feed System Monitoring Routes
 * For observability and debugging
 */

// Get outbox worker statistics
router.get("/outbox", generalLimiter, getOutboxStats);

// Get WebSocket connection statistics
router.get("/websocket", generalLimiter, getSocketStats);

// Get complete system statistics
router.get("/system", generalLimiter, getFeedSystemStats);

// Get pending events
router.get("/events/pending", generalLimiter, getPendingEvents);

// Get failed events
router.get("/events/failed", generalLimiter, getFailedEvents);

// Retry a failed event
router.post("/events/:eventId/retry", generalLimiter, retryFailedEvent);

module.exports = router;
