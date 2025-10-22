import express from "express";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
} from "../controllers/postController.js";
import { createPostLimiter, generalLimiter } from "../middleware/rateLimit.js";
import { sanitizeInput } from "../middleware/security.js";

const router = express.Router();

// Public routes
router.get("/", generalLimiter, getPosts);
router.get("/search", generalLimiter, searchPosts);
router.get("/:id", generalLimiter, getPostById);

// Protected routes (authentication handled client-side with Better Auth)
router.post("/", createPostLimiter, sanitizeInput, createPost);
router.put("/:id", generalLimiter, sanitizeInput, updatePost);
router.delete("/:id", generalLimiter, deletePost);
router.post("/:id/like", generalLimiter, likePost);

export default router;
