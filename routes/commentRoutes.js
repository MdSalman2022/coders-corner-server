const express = require("express");
const {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
} = require("../controllers/commentController");
const { generalLimiter } = require("../middleware/rateLimit");
const { sanitizeInput } = require("../middleware/security");

const router = express.Router();

// Get comments for a post
router.get("/post/:postId", generalLimiter, getComments);

// Create a comment
router.post("/post/:postId", generalLimiter, sanitizeInput, createComment);

// Update a comment
router.put("/:commentId", generalLimiter, sanitizeInput, updateComment);

// Delete a comment
router.delete("/:commentId", generalLimiter, deleteComment);

// Like/unlike a comment
router.post("/:commentId/like", generalLimiter, likeComment);

module.exports = router;
