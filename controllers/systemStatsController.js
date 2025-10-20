const Outbox = require("../models/Outbox");
const outboxWorker = require("../workers/outboxWorker");
const {
  getConnectedUsersCount,
  getUserSocketCount,
} = require("../config/socket.js");

/**
 * System Stats Controller
 * Monitors feed system health and performance
 */

/**
 * Get Outbox worker statistics
 */
const getOutboxStats = async (req, res) => {
  try {
    const stats = await outboxWorker.getStats();

    if (!stats) {
      return res.status(500).json({ message: "Failed to get worker stats" });
    }

    res.json({
      worker: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Socket.io connection statistics
 */
const getSocketStats = async (req, res) => {
  try {
    const connectedUsers = getConnectedUsersCount();

    res.json({
      connectedUsers,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get complete feed system statistics
 */
const getFeedSystemStats = async (req, res) => {
  try {
    // Get worker stats
    const workerStats = await outboxWorker.getStats();
    const connectedUsers = getConnectedUsersCount();

    // Get recent event counts
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = await Outbox.countDocuments({
      createdAt: { $gte: last24Hours },
    });

    res.json({
      system: {
        status: "operational",
        timestamp: new Date(),
      },
      worker: workerStats,
      websocket: {
        connectedUsers,
      },
      events: {
        recentEvents24h: recentEvents,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get pending events detail
 */
const getPendingEvents = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const events = await Outbox.find({ status: "pending" })
      .sort({ scheduledAt: 1 })
      .limit(parseInt(limit))
      .lean();

    const total = await Outbox.countDocuments({ status: "pending" });

    res.json({
      events,
      total,
      showing: events.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get failed events
 */
const getFailedEvents = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const events = await Outbox.find({ status: "failed" })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const total = await Outbox.countDocuments({ status: "failed" });

    res.json({
      events,
      total,
      showing: events.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retry a failed event
 */
const retryFailedEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Outbox.findByIdAndUpdate(
      eventId,
      {
        $set: {
          status: "pending",
          attempts: 0,
          error: null,
          scheduledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      message: "Event queued for retry",
      event,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOutboxStats,
  getSocketStats,
  getFeedSystemStats,
  getPendingEvents,
  getFailedEvents,
  retryFailedEvent,
};
