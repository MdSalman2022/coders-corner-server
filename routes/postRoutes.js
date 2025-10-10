const express = require("express");
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
} = require("../controllers/postController");
const { authenticateToken } = require("../middleware/auth");
const {
  createPostLimiter,
  generalLimiter,
} = require("../middleware/rateLimit");
const { sanitizeInput } = require("../middleware/security");

const router = express.Router();

router.get("/", generalLimiter, getPosts);
router.get("/search", generalLimiter, searchPosts);
router.get("/:id", generalLimiter, getPostById);
router.post(
  "/",
  authenticateToken,
  createPostLimiter,
  sanitizeInput,
  createPost
);
router.put(
  "/:id",
  authenticateToken,
  generalLimiter,
  sanitizeInput,
  updatePost
);
router.delete("/:id", authenticateToken, generalLimiter, deletePost);
router.post("/:id/like", authenticateToken, generalLimiter, likePost);

module.exports = router;
