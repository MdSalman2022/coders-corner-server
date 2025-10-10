const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserStats,
} = require("../controllers/userController");
const { generalLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Public routes
router.get("/:id", generalLimiter, getUserProfile);
router.get("/:id/stats", generalLimiter, getUserStats);

// Protected routes (authentication handled client-side with Better Auth)
router.put("/profile", generalLimiter, updateUserProfile);
router.post("/:id/follow", generalLimiter, followUser);

module.exports = router;
