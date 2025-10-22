import express from "express";
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getUserStats,
  getCurrentUser,
  getFollowingUsers,
  getFollowerUsers,
} from "../controllers/userController.js";
import { generalLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Public routes
router.post("/", generalLimiter, createUserProfile);
router.post("/me", generalLimiter, getCurrentUser);
router.get("/:id", generalLimiter, getUserProfile);
router.get("/:id/stats", generalLimiter, getUserStats);
router.get("/:userId/following-users", generalLimiter, getFollowingUsers);
router.get("/:userId/follower-users", generalLimiter, getFollowerUsers);

// Protected routes
router.put("/profile", generalLimiter, updateUserProfile);
router.post("/:id/follow", generalLimiter, followUser);
router.delete("/:id/follow", generalLimiter, unfollowUser);

export default router;
