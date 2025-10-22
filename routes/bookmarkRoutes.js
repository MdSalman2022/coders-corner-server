import express from "express";
const router = express.Router();
import Bookmark from "../models/Bookmark.js";
import Post from "../models/Post.js";
import { ensureUserExists } from "../utils/userSync.js";

router.get("/ids", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await ensureUserExists(userId);
    if (!user) {
      console.error("❌ User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const bookmarks = await Bookmark.find({ userId: user._id })
      .select("postId")
      .lean();

    const postIds = bookmarks.map((b) => b.postId.toString());

    console.log(`✅ Loaded ${postIds.length} bookmark IDs for user ${userId}`);

    res.status(200).json({
      success: true,
      postIds,
      total: postIds.length,
    });
  } catch (error) {
    console.error("Get bookmark IDs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookmark IDs",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({
        success: false,
        message: "postId and userId are required",
      });
    }

    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const existingBookmark = await Bookmark.findOne({
      userId: user._id,
      postId,
    });
    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: "Post already bookmarked",
      });
    }

    const bookmark = new Bookmark({
      userId: user._id,
      postId,
    });

    await bookmark.save();

    res.status(201).json({
      success: true,
      message: "Post bookmarked successfully",
      bookmark,
    });
  } catch (error) {
    console.error("Bookmark creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create bookmark",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    console.log("📌 Get bookmarks - userId received:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await ensureUserExists(userId);
    if (!user) {
      console.error("❌ User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User found - MongoDB _id:", user._id);

    const bookmarks = await Bookmark.find({ userId: user._id })
      .populate({
        path: "postId",
        select:
          "title excerpt author publishedAt readingTime tags likes comments views",
        populate: {
          path: "author",
          select: "name avatar betterAuthId",
        },
      })
      .sort({ createdAt: -1 });

    console.log("📚 Bookmarks found:", bookmarks.length);

    const formattedBookmarks = bookmarks.map((bookmark) => ({
      ...bookmark.postId.toObject(),
      _id: bookmark.postId._id,
    }));

    res.status(200).json({
      success: true,
      bookmarks: formattedBookmarks,
      total: formattedBookmarks.length,
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookmarks",
    });
  }
});

router.get("/check/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const bookmark = await Bookmark.findOne({ userId: user._id, postId });

    res.status(200).json({
      success: true,
      isBookmarked: !!bookmark,
      bookmarkId: bookmark?._id,
    });
  } catch (error) {
    console.error("Check bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check bookmark",
    });
  }
});

router.delete("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await Bookmark.findOneAndDelete({
      userId: user._id,
      postId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookmark removed successfully",
    });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete bookmark",
    });
  }
});

export default router;
