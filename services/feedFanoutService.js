const User = require("../models/User");
const Post = require("../models/Post");
const UserTimeline = require("../models/UserTimeline");

/**
 * FeedFanoutService - Hybrid Push-Pull Strategy
 * Implements fanout-on-write for small follower counts
 * Implements fanout-on-read for large follower counts
 *
 * Decision Logic:
 * - < 500 followers: PUSH to all (write to timelines immediately)
 * - 500-5000 followers: HYBRID (push to active users, store for pull)
 * - > 5000 followers: PULL (store only, followers pull on-demand)
 */

class FeedFanoutService {
  // Follower thresholds
  PUSH_THRESHOLD = 500; // Below this = full push
  HYBRID_THRESHOLD = 5000; // Between 500-5000 = hybrid

  /**
   * Main entry point: Publish a new post
   * Called when post is created or updated
   */
  async publishPost(postData) {
    try {
      console.log("\n📤 [FanoutService] Starting post publication...");
      console.log(`   Post ID: ${postData._id}`);
      console.log(`   Author ID: ${postData.author}`);

      // Get author with follower info
      const author = await User.findById(postData.author).select("followers");

      if (!author) {
        throw new Error(`Author not found: ${postData.author}`);
      }

      const followerCount = author.followers.length;
      console.log(`   Follower count: ${followerCount}`);

      // Determine strategy based on follower count
      if (followerCount < this.PUSH_THRESHOLD) {
        console.log(`   🚀 Strategy: PUSH (all ${followerCount} followers)`);
        await this.pushToAllFollowers(postData, author.followers);
      } else if (followerCount < this.HYBRID_THRESHOLD) {
        console.log(
          `   ⚖️  Strategy: HYBRID (${followerCount} followers, will push to active users)`
        );
        await this.hybridApproach(postData, author.followers);
      } else {
        console.log(
          `   📥 Strategy: PULL (${followerCount} followers, store for pull)`
        );
        // For large follower counts, post is already in Post collection
        // Followers will pull on-demand
      }

      console.log(`   ✅ Publication complete\n`);
      return true;
    } catch (error) {
      console.error(`   ❌ Publication error: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * PUSH Strategy: Add post to all followers' timelines
   * Direct write to UserTimeline collection
   */
  async pushToAllFollowers(postData, followerIds) {
    try {
      console.log(
        `   📝 Pushing to ${followerIds.length} followers' timelines...`
      );

      if (followerIds.length === 0) {
        console.log(`   ⚠️  No followers to push to`);
        return;
      }

      // Prepare timeline item
      const timelineItem = this.createTimelineItem(postData);

      // Batch process to avoid overwhelming DB
      const BATCH_SIZE = 100;
      const batches = this.chunkArray(followerIds, BATCH_SIZE);

      let totalUpdated = 0;

      for (const batch of batches) {
        const operations = batch.map((followerId) => ({
          updateOne: {
            filter: { userId: followerId },
            update: {
              $push: {
                feed: {
                  $each: [timelineItem],
                  $position: 0, // Add to beginning (newest first)
                  $slice: 2000, // Keep only most recent 2000 items
                },
              },
              $inc: { totalItems: 1 },
              $set: { lastUpdated: new Date() },
            },
            upsert: true, // Create timeline if doesn't exist
          },
        }));

        await UserTimeline.bulkWrite(operations);
        totalUpdated += batch.length;
        console.log(`   ✅ Batch of ${batch.length} timelines updated`);

        // Small delay between batches to avoid DB spike
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      console.log(`   ✅ Total timelines updated: ${totalUpdated}`);
    } catch (error) {
      console.error(`   ❌ Error pushing to followers: ${error.message}`);
      throw error;
    }
  }

  /**
   * HYBRID Strategy: Push to followers + store in event log
   * Used for medium-sized follower counts
   */
  async hybridApproach(postData, followerIds) {
    try {
      console.log(
        `   📝 Hybrid approach for ${followerIds.length} followers...`
      );

      // Push to subset of active followers
      // In production, you'd query for active users (last seen < 7 days)
      // For now, push to first 500 and let others pull
      const activeFetchLimit = 500;
      const activeFollowers = followerIds.slice(0, activeFetchLimit);

      if (activeFollowers.length > 0) {
        console.log(
          `   📤 Pushing to ${activeFollowers.length} active followers...`
        );
        await this.pushToAllFollowers(postData, activeFollowers);
      }

      // Store for pull access (post already in Post collection)
      // Other followers will pull on-demand when they check feed
      console.log(`   📥 Remaining followers can pull on-demand`);
    } catch (error) {
      console.error(`   ❌ Error in hybrid approach: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create timeline item from post data
   * Optimized for quick timeline reads
   */
  createTimelineItem(postData) {
    return {
      postId: postData._id,
      title: postData.title,
      excerpt: postData.excerpt || "",
      coverImage: postData.coverImage,
      authorId: postData.author,
      authorName: postData.authorName,
      authorAvatar: postData.authorAvatar,
      tags: postData.tags || [],
      category: postData.category,
      readingTime: postData.readingTime,
      views: postData.views || 0,
      likesCount: postData.likesCount || 0,
      commentsCount: postData.commentsCount || 0,
      createdAt: postData.createdAt || new Date(),
      publishedAt: postData.publishedAt || new Date(),
      source: "push",
    };
  }

  /**
   * Get user's home feed (following + hybrid)
   * Uses pre-computed timeline + fall-back to pull
   */
  async getHomeTimeline(userId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      console.log(
        `   📖 Fetching home timeline for user ${userId}, page ${page}`
      );

      // Try to get from pre-computed timeline first
      const timeline = await UserTimeline.findOne({ userId })
        .select("feed")
        .lean();

      if (timeline && timeline.feed && timeline.feed.length > 0) {
        console.log(`   ✅ Found ${timeline.feed.length} items in timeline`);

        // Return paginated results
        const paginatedFeed = timeline.feed.slice(skip, skip + limit);
        const total = timeline.feed.length;

        return {
          feeds: paginatedFeed,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalFeeds: total,
            hasMore: skip + limit < total,
          },
        };
      }

      // Fallback: PULL from following
      console.log(`   📥 Timeline not found, pulling from following...`);
      return await this.getPullBasedTimeline(userId, page, limit);
    } catch (error) {
      console.error(`   ❌ Error fetching home timeline: ${error.message}`);
      throw error;
    }
  }

  /**
   * PULL-based timeline generation
   * Queries posts from followed authors on-demand
   */
  async getPullBasedTimeline(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      // Get user's following list
      const user = await User.findById(userId).select("following").lean();

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const followingIds = user.following || [];
      followingIds.push(userId); // Include own posts

      // Query posts from following
      const posts = await Post.find({
        author: { $in: followingIds },
        status: "published",
      })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar betterAuthId bio")
        .lean();

      const total = await Post.countDocuments({
        author: { $in: followingIds },
        status: "published",
      });

      // Transform for timeline view
      const feeds = posts.map((post) => ({
        postId: post._id,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        authorId: post.author._id,
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
        source: "pull",
      }));

      return {
        feeds,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalFeeds: total,
          hasMore: skip + limit < total,
        },
      };
    } catch (error) {
      console.error(`   ❌ Error in pull-based timeline: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discover feed (trending/popular posts)
   * Pure PULL strategy - ranking-based
   */
  async getDiscoverFeed(options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = "trending" } = options;
      const skip = (page - 1) * limit;

      console.log(`   🎯 Fetching discover feed (${sortBy}), page ${page}`);

      let sort = {};

      switch (sortBy) {
        case "trending":
          // Posts with high engagement in last 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const posts = await Post.find({
            status: "published",
            publishedAt: { $gte: sevenDaysAgo },
          })
            .sort({ views: -1, "likes.length": -1 })
            .skip(skip)
            .limit(limit)
            .populate("author", "name avatar betterAuthId bio")
            .lean();

          const total = await Post.countDocuments({
            status: "published",
            publishedAt: { $gte: sevenDaysAgo },
          });

          return this.transformPostsToFeed(posts, page, limit, total);

        case "latest":
          // Most recent posts
          const latestPosts = await Post.find({ status: "published" })
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("author", "name avatar betterAuthId bio")
            .lean();

          const latestTotal = await Post.countDocuments({
            status: "published",
          });

          return this.transformPostsToFeed(
            latestPosts,
            page,
            limit,
            latestTotal
          );

        case "popular":
          // Most liked posts
          const popularPosts = await Post.find({ status: "published" })
            .sort({ "likes.length": -1, views: -1 })
            .skip(skip)
            .limit(limit)
            .populate("author", "name avatar betterAuthId bio")
            .lean();

          const popularTotal = await Post.countDocuments({
            status: "published",
          });

          return this.transformPostsToFeed(
            popularPosts,
            page,
            limit,
            popularTotal
          );

        default:
          throw new Error(`Unknown sort type: ${sortBy}`);
      }
    } catch (error) {
      console.error(`   ❌ Error fetching discover feed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform posts array to feed format
   */
  transformPostsToFeed(posts, page, limit, total) {
    const feeds = posts.map((post) => ({
      postId: post._id,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      authorId: post.author._id,
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
      source: "pull",
    }));

    return {
      feeds,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFeeds: total,
        hasMore: (page - 1) * limit + limit < total,
      },
    };
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update post in all follower timelines (for post updates)
   */
  async updatePostInTimelines(postData) {
    try {
      console.log(`   🔄 Updating post in timelines...`);

      const timelineItem = this.createTimelineItem(postData);

      await UserTimeline.updateMany(
        { "feed.postId": postData._id },
        {
          $set: {
            "feed.$": timelineItem,
            lastUpdated: new Date(),
          },
        }
      );

      console.log(`   ✅ Post updated in timelines`);
    } catch (error) {
      console.error(`   ❌ Error updating post in timelines: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove post from all follower timelines
   */
  async removePostFromTimelines(postId) {
    try {
      console.log(`   🗑️  Removing post from timelines...`);

      await UserTimeline.updateMany(
        { "feed.postId": postId },
        {
          $pull: { feed: { postId } },
          $inc: { totalItems: -1 },
          $set: { lastUpdated: new Date() },
        }
      );

      console.log(`   ✅ Post removed from timelines`);
    } catch (error) {
      console.error(
        `   ❌ Error removing post from timelines: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = new FeedFanoutService();
