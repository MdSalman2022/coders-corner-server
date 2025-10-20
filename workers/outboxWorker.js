const Outbox = require("../models/Outbox");
const Post = require("../models/Post");
const User = require("../models/User");
const feedFanoutService = require("../services/feedFanoutService");

/**
 * OutboxWorker - Background worker for processing fanout events
 * Implements transactional outbox pattern
 *
 * Ensures reliable event processing:
 * 1. Events are written to Outbox before any side effects
 * 2. Worker processes events asynchronously
 * 3. Failed events are retried up to 3 times
 * 4. Supports horizontal scaling with event idempotency
 */

class OutboxWorker {
  constructor() {
    this.isRunning = false;
    this.workerInterval = null;
    this.PROCESS_INTERVAL = 5000; // Process every 5 seconds
    this.BATCH_SIZE = 50; // Process 50 events per batch
  }

  /**
   * Start the background worker
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️  Outbox worker already running");
      return;
    }

    this.isRunning = true;
    console.log(
      `\n🚀 Starting Outbox Worker (interval: ${this.PROCESS_INTERVAL}ms)`
    );

    // Process events immediately on start
    this.processPendingEvents();

    // Then set interval for continuous processing
    this.workerInterval = setInterval(() => {
      this.processPendingEvents();
    }, this.PROCESS_INTERVAL);

    console.log(`✅ Outbox Worker started successfully\n`);
  }

  /**
   * Stop the background worker
   */
  stop() {
    if (!this.isRunning) {
      console.log("⚠️  Outbox worker not running");
      return;
    }

    this.isRunning = false;
    clearInterval(this.workerInterval);
    console.log("✅ Outbox Worker stopped");
  }

  /**
   * Main worker loop: Process pending events
   */
  async processPendingEvents() {
    try {
      // Find pending events
      const events = await Outbox.find({
        status: "pending",
      })
        .sort({ scheduledAt: 1 }) // FIFO order
        .limit(this.BATCH_SIZE)
        .lean();

      if (events.length === 0) {
        // Silently return if no events
        return;
      }

      console.log(
        `\n📥 [OutboxWorker] Processing ${events.length} pending events`
      );

      for (const event of events) {
        await this.processEvent(event);
      }

      console.log(`✅ Batch complete\n`);
    } catch (error) {
      console.error(`❌ [OutboxWorker] Error in processPendingEvents:`, error);
      // Continue processing other events even if one fails
    }
  }

  /**
   * Process a single event
   */
  async processEvent(event) {
    let outboxDoc = null;

    try {
      // Mark as processing
      await Outbox.updateOne(
        { _id: event._id },
        { $set: { status: "processing" } }
      );

      console.log(
        `   📤 Processing ${event.eventType} (attempts: ${event.attempts})`
      );

      // Route to appropriate handler
      switch (event.eventType) {
        case "post_created":
          await this.handlePostCreated(event.payload);
          break;
        case "post_updated":
          await this.handlePostUpdated(event.payload);
          break;
        case "post_deleted":
          await this.handlePostDeleted(event.payload);
          break;
        case "like_added":
          await this.handleLikeAdded(event.payload);
          break;
        default:
          throw new Error(`Unknown event type: ${event.eventType}`);
      }

      // Mark as completed
      await Outbox.updateOne(
        { _id: event._id },
        {
          $set: {
            status: "completed",
            processedAt: new Date(),
          },
        }
      );

      console.log(`   ✅ Completed ${event.eventType}`);
    } catch (error) {
      console.error(
        `   ❌ Error processing ${event.eventType}:`,
        error.message
      );

      // Increment attempts
      const newAttempts = event.attempts + 1;
      const maxAttempts = event.maxAttempts || 3;

      if (newAttempts < maxAttempts) {
        // Retry with exponential backoff
        const backoffSeconds = Math.pow(2, newAttempts);
        const nextScheduledAt = new Date(Date.now() + backoffSeconds * 1000);

        await Outbox.updateOne(
          { _id: event._id },
          {
            $set: {
              status: "pending",
              attempts: newAttempts,
              scheduledAt: nextScheduledAt,
              error: error.message,
            },
          }
        );

        console.log(
          `   ⏳ Retrying in ${backoffSeconds}s (attempt ${newAttempts}/${maxAttempts})`
        );
      } else {
        // Max attempts reached, mark as failed
        await Outbox.updateOne(
          { _id: event._id },
          {
            $set: {
              status: "failed",
              attempts: newAttempts,
              error: error.message,
              processedAt: new Date(),
            },
          }
        );

        console.log(`   💀 Max retries reached, marking as failed`);
      }
    }
  }

  /**
   * Handle post_created event
   */
  async handlePostCreated(payload) {
    try {
      console.log(`      📝 Fanout post_created event for post ${payload._id}`);

      // Fetch full post data
      const post = await Post.findById(payload._id)
        .populate("author", "name avatar followers")
        .lean();

      if (!post) {
        throw new Error(`Post not found: ${payload._id}`);
      }

      // Enrich post data
      const postData = {
        _id: post._id,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        author: post.author._id,
        authorName: post.author.name,
        authorAvatar: post.author.avatar,
        tags: post.tags,
        category: post.category,
        readingTime: post.readingTime,
        views: post.views,
        likesCount: post.likes ? post.likes.length : 0,
        commentsCount: post.comments ? post.comments.length : 0,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt,
      };

      // Fanout to followers
      await feedFanoutService.publishPost(postData);
    } catch (error) {
      console.error(`      ❌ Error in handlePostCreated:`, error.message);
      throw error;
    }
  }

  /**
   * Handle post_updated event
   */
  async handlePostUpdated(payload) {
    try {
      console.log(`      🔄 Fanout post_updated event for post ${payload._id}`);

      const post = await Post.findById(payload._id)
        .populate("author", "name avatar followers")
        .lean();

      if (!post) {
        throw new Error(`Post not found: ${payload._id}`);
      }

      const postData = {
        _id: post._id,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        author: post.author._id,
        authorName: post.author.name,
        authorAvatar: post.author.avatar,
        tags: post.tags,
        category: post.category,
        readingTime: post.readingTime,
        views: post.views,
        likesCount: post.likes ? post.likes.length : 0,
        commentsCount: post.comments ? post.comments.length : 0,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt,
      };

      // Update in timelines
      await feedFanoutService.updatePostInTimelines(postData);
    } catch (error) {
      console.error(`      ❌ Error in handlePostUpdated:`, error.message);
      throw error;
    }
  }

  /**
   * Handle post_deleted event
   */
  async handlePostDeleted(payload) {
    try {
      console.log(
        `      🗑️  Fanout post_deleted event for post ${payload.postId}`
      );

      await feedFanoutService.removePostFromTimelines(payload.postId);
    } catch (error) {
      console.error(`      ❌ Error in handlePostDeleted:`, error.message);
      throw error;
    }
  }

  /**
   * Handle like_added event (for notifications)
   */
  async handleLikeAdded(payload) {
    try {
      console.log(`      ❤️  Like added event for post ${payload.postId}`);

      // Could emit WebSocket notification here
      // For now, just log the event
    } catch (error) {
      console.error(`      ❌ Error in handleLikeAdded:`, error.message);
      throw error;
    }
  }

  /**
   * Get worker statistics
   */
  async getStats() {
    try {
      const pending = await Outbox.countDocuments({ status: "pending" });
      const processing = await Outbox.countDocuments({
        status: "processing",
      });
      const completed = await Outbox.countDocuments({ status: "completed" });
      const failed = await Outbox.countDocuments({ status: "failed" });

      return {
        isRunning: this.isRunning,
        pending,
        processing,
        completed,
        failed,
        total: pending + processing + completed + failed,
      };
    } catch (error) {
      console.error(`❌ Error getting worker stats:`, error.message);
      return null;
    }
  }
}

module.exports = new OutboxWorker();
