import express from "express";
const router = express.Router();
import User from "../models/User.js";
import { ensureUserExists } from "../utils/userSync.js";

router.post("/me", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log("🔄 Fetching user for userId:", userId);

    // Try to find existing user
    let user = await User.findOne({ betterAuthId: userId })
      .populate("role", "name displayName permissions")
      .select("-password");

    // If user doesn't exist in userinfo, create/sync from Better Auth
    if (!user) {
      console.log("📝 User not found in userinfo, syncing from Better Auth...");
      user = await ensureUserExists(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          needsSync: true,
        });
      }

      // Re-populate role after syncing
      user = await User.findById(user._id)
        .populate("role", "name displayName permissions")
        .select("-password");
    }

    console.log("✅ User found:", user.email);

    res.json({
      user: {
        ...user.toObject(),
        roleName: user.role?.name || user.roleName || "user",
        id: user.betterAuthId,
      },
    });
  } catch (error) {
    console.error("❌ Auth me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
