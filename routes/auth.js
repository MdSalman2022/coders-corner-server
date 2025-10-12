const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Get current user data (for auth context)
router.post("/me", async (req, res) => {
  try {
    // Get userId from request body (passed from frontend)
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Find user and populate role to get roleName
    const user = await User.findOne({ betterAuthId: userId })
      .populate("role", "name displayName permissions")
      .select("-password"); // Exclude sensitive fields if any

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user with roleName
    res.json({
      user: {
        ...user.toObject(),
        roleName: user.role?.name || user.roleName || "user", // Fallback
        id: user.betterAuthId, // Ensure consistent ID field
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
