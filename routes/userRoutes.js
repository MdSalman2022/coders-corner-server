const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserStats,
} = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");
const { generalLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/:id", generalLimiter, getUserProfile);
router.put("/profile", authenticateToken, generalLimiter, updateUserProfile);
router.post("/:id/follow", authenticateToken, generalLimiter, followUser);
router.get("/:id/stats", generalLimiter, getUserStats);

module.exports = router;
