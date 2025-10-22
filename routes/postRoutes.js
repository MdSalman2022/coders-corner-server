import express from "express";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
  getTrendingTags,
  getFollowingFeed,
} from "../controllers/postController.js";
import { createPostLimiter, generalLimiter } from "../middleware/rateLimit.js";
import { sanitizeInput } from "../middleware/security.js";

const router = express.Router();

router.get("/", generalLimiter, getPosts);
router.get("/trending-tags", generalLimiter, getTrendingTags);
router.get("/search", generalLimiter, searchPosts);
router.post("/feed/following", generalLimiter, getFollowingFeed);
router.get("/:id", generalLimiter, getPostById);

router.post("/", createPostLimiter, sanitizeInput, createPost);
router.put("/:id", generalLimiter, sanitizeInput, updatePost);
router.delete("/:id", generalLimiter, deletePost);
router.post("/:id/like", generalLimiter, likePost);

export default router;
