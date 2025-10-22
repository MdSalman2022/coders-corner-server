import express from "express";
const router = express.Router();
import { requireAdmin } from "../middleware/auth.js";
import {
  getAdminStats,
  getUsers,
  updateUserRole,
  getPosts,
  updatePostStatus,
  updatePostFeatured,
  deletePost,
} from "../controllers/adminController.js";

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

export default router;
