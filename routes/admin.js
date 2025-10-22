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

router.use(requireAdmin);

router.post("/stats", getAdminStats);

router.post("/users", getUsers);
router.put("/users/:userId/role", updateUserRole);

router.post("/posts", getPosts);
router.put("/posts/:postId/status", updatePostStatus);
router.put("/posts/:postId/featured", updatePostFeatured);
router.delete("/posts/:postId", deletePost);

export default router;
