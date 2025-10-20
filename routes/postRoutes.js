const express = require("express");
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
  getFollowingPosts,
} = require("../controllers/postController");
const {
  createPostLimiter,
  generalLimiter,
} = require("../middleware/rateLimit");
const { sanitizeInput } = require("../middleware/security");

const router = express.Router();

// Public routes
router.get("/", generalLimiter, getPosts);
router.get("/search", generalLimiter, searchPosts);
router.post("/feed/following", generalLimiter, getFollowingPosts);
router.get("/:id", generalLimiter, getPostById);

// Protected routes (authentication handled client-side with Better Auth)
router.post("/", createPostLimiter, sanitizeInput, createPost);
router.put("/:id", generalLimiter, sanitizeInput, updatePost);
router.delete("/:id", generalLimiter, deletePost);
router.post("/:id/like", generalLimiter, likePost);

module.exports = router;
