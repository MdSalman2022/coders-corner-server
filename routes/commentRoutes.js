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

router.get("/post/:postId", generalLimiter, getComments);

router.post("/post/:postId", generalLimiter, sanitizeInput, createComment);

router.put("/:commentId", generalLimiter, sanitizeInput, updateComment);

router.delete("/:commentId", generalLimiter, deleteComment);

router.post("/:commentId/like", generalLimiter, likeComment);

export default router;
