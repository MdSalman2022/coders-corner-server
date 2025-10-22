import express from "express";
const router = express.Router();
import Post from "../models/Post.js";
import User from "../models/User.js";
import { ensureUserExists } from "../utils/userSync.js";

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const posts = await Post.find({ author: user._id, status: "published" });

    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = posts.reduce(
      (sum, post) => sum + (post.likes?.length || 0),
      0
    );
    const totalComments = posts.reduce(
      (sum, post) => sum + (post.comments?.length || 0),
      0
    );
    const averageViews =
      posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

    const followers = user?.followers?.length || 0;
    const following = user?.following?.length || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalViews,
        totalLikes,
        totalComments,
        totalReads: totalViews,
        followers,
        following,
        totalPosts: posts.length,
        averageViews,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
    });
  }
});

router.get("/posts", async (req, res) => {
  try {
    const { userId, timeRange } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const now = new Date();
    let dateFrom = new Date();

    if (timeRange === "week") {
      dateFrom.setDate(now.getDate() - 7);
    } else if (timeRange === "month") {
      dateFrom.setMonth(now.getMonth() - 1);
    }

    const query = {
      author: user._id,
      status: "published",
    };

    if (timeRange !== "all") {
      query.publishedAt = { $gte: dateFrom };
    }

    const posts = await Post.find(query)
      .select("title views likes comments createdAt publishedAt")
      .sort({ publishedAt: -1 });

    const postsWithEngagement = posts.map((post) => ({
      _id: post._id,
      title: post.title,
      views: post.views || 0,
      reads: post.views || 0,
      likes: post.likes?.length || 0,
      comments: post.comments?.length || 0,
      createdAt: post.createdAt,
      publishedAt: post.publishedAt,
      engagementRate:
        post.views > 0
          ? (((post.likes?.length || 0) + (post.comments?.length || 0)) /
              post.views) *
            100
          : 0,
    }));

    const summary = {
      totalViews: postsWithEngagement.reduce((sum, p) => sum + p.views, 0),
      totalReads: postsWithEngagement.reduce((sum, p) => sum + p.reads, 0),
      totalLikes: postsWithEngagement.reduce((sum, p) => sum + p.likes, 0),
      totalComments: postsWithEngagement.reduce(
        (sum, p) => sum + p.comments,
        0
      ),
      period: timeRange || "all",
    };

    res.status(200).json({
      success: true,
      posts: postsWithEngagement,
      summary,
    });
  } catch (error) {
    console.error("Get post stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch post stats",
    });
  }
});

router.post("/views/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.views = (post.views || 0) + 1;
    await post.save();

    res.status(200).json({
      success: true,
      message: "View recorded",
      views: post.views,
    });
  } catch (error) {
    console.error("Track view error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track view",
    });
  }
});

export default router;
