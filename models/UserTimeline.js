const mongoose = require("mongoose");

/**
 * UserTimeline Schema - Denormalized per-user feed for fast reads
 * Stores recent posts from followed authors for each user
 * Part of PUSH strategy (fanout-on-write)
 */

const TimelineItemSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    excerpt: { type: String },
    coverImage: { type: String },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorName: { type: String },
    authorAvatar: { type: String },
    tags: [{ type: String }],
    category: { type: String },
    readingTime: { type: Number },
    views: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    createdAt: { type: Date, required: true, index: true },
    publishedAt: { type: Date, index: true },
    source: {
      type: String,
      enum: ["push", "pull"],
      default: "push",
    }, // Indicates how post was added to timeline
  },
  { _id: false }
);

const UserTimelineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },
  feed: {
    type: [TimelineItemSchema],
    default: [],
  },
  totalItems: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Compound index for efficient timeline queries
UserTimelineSchema.index({ userId: 1, "feed.createdAt": -1 });

// TTL index to auto-delete old entries after 90 days (optional, can be disabled)
// UserTimelineSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model("UserTimeline", UserTimelineSchema);
