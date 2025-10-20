const mongoose = require("mongoose");

/**
 * Outbox Schema - Event sourcing pattern for reliable fanout
 * Stores pending events that need to be processed by worker
 * Ensures no posts are lost if worker crashes
 * Pattern: Transactional Outbox (commonly used in Twitter, LinkedIn)
 */

const OutboxSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ["post_created", "post_updated", "post_deleted", "like_added"],
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  error: {
    type: String,
  },
  scheduledAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  processedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient worker queries
OutboxSchema.index({ status: 1, scheduledAt: 1 });
OutboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

module.exports = mongoose.model("Outbox", OutboxSchema);
