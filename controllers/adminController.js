const User = require("../models/User");
const Post = require("../models/Post");
const Role = require("../models/Role");
const { requireAdmin } = require("../middleware/auth");

// Get admin dashboard stats
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ status: "published" });
    const draftPosts = await Post.countDocuments({ status: "draft" });

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt");

    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("author", "name")
      .select("title status createdAt author");

    res.json({
      stats: {
        totalUsers,
        totalPosts,
        publishedPosts,
        draftPosts,
      },
      recentActivity: {
        users: recentUsers,
        posts: recentPosts,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
};

// Get all users with pagination
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.body;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query)
      .populate("role", "name displayName")
      .select("name email avatar role roleName createdAt stats")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        roleName: user.roleName,
        createdAt: user.createdAt,
        stats: user.stats,
      })),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleName } = req.body;

    // Validate role exists
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      {
        role: role._id,
        roleName: role.name,
      },
      { new: true }
    ).populate("role", "name displayName");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleName: user.roleName,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
};

// Get all posts for moderation
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "all", search = "" } = req.body;

    const query = {};
    if (status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const posts = await Post.find(query)
      .populate("author", "name email")
      .select("title content status excerpt createdAt updatedAt author views")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts: posts.map((post) => ({
        _id: post._id,
        title: post.title,
        excerpt: post.excerpt,
        status: post.status,
        author: post.author,
        views: post.views,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// Update post status
const updatePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "published", "archived"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { status },
      { new: true }
    ).populate("author", "name email");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({
      post: {
        _id: post._id,
        title: post.title,
        status: post.status,
        author: post.author,
      },
    });
  } catch (error) {
    console.error("Update post status error:", error);
    res.status(500).json({ message: "Failed to update post status" });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Update user stats
    await User.findByIdAndUpdate(post.author, {
      $inc: { "stats.postsCount": -1 },
    });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  updateUserRole,
  getPosts,
  updatePostStatus,
  deletePost,
};
