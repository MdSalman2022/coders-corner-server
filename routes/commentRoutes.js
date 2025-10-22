import express from "express";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
} from "../controllers/commentController.js";
import { generalLimiter } from "../middleware/rateLimit.js";
import { sanitizeInput } from "../middleware/security.js";

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

export default router;
