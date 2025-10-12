const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const {
  getAdminStats,
  getUsers,
  updateUserRole,
  getPosts,
  updatePostStatus,
  updatePostFeatured,
  deletePost,
} = require("../controllers/adminController");

// Apply admin middleware to all routes
router.use(requireAdmin);

// Dashboard stats
router.post("/stats", getAdminStats);

// User management
router.post("/users", getUsers);
router.put("/users/:userId/role", updateUserRole);

// Content management
router.post("/posts", getPosts);
router.put("/posts/:postId/status", updatePostStatus);
router.put("/posts/:postId/featured", updatePostFeatured);
router.delete("/posts/:postId", deletePost);

module.exports = router;
